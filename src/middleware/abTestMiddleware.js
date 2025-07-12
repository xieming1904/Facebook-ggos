const ABTest = require('../models/ABTest');
const LandingPage = require('../models/LandingPage');
const logger = require('../utils/logger');

// A/B测试中间件
const abTestMiddleware = async (req, res, next) => {
  try {
    const pageId = req.params.id;
    
    // 查找关联的A/B测试
    const runningTests = await ABTest.find({
      status: 'running',
      'variants.landingPageId': pageId,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: { $gte: new Date() } },
        { endDate: null }
      ]
    }).populate('variants.landingPageId');
    
    if (runningTests.length === 0) {
      // 没有活跃的A/B测试，正常处理
      return next();
    }
    
    // 如果有多个测试，选择最新的一个
    const activeTest = runningTests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    // 获取或生成访客会话ID
    let sessionId = req.cookies.ab_session || generateSessionId();
    
    // 设置会话cookie（24小时过期）
    res.cookie('ab_session', sessionId, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    // 确定变体分配
    let selectedVariant = await getVariantForSession(activeTest, sessionId, pageId);
    
    // 如果没有找到变体，使用默认逻辑分配
    if (!selectedVariant) {
      selectedVariant = assignVariant(activeTest, sessionId, pageId);
    }
    
    // 记录访问事件
    await recordVisitEvent(activeTest._id, selectedVariant._id, sessionId, req);
    
    // 将选中的变体ID存储在请求中
    req.abTest = {
      testId: activeTest._id,
      variantId: selectedVariant._id,
      sessionId: sessionId
    };
    
    // 如果选中的变体不是当前页面，需要重定向
    const selectedPageId = selectedVariant.landingPageId._id || selectedVariant.landingPageId;
    if (selectedPageId.toString() !== pageId) {
      return res.redirect(`/page/${selectedPageId}`);
    }
    
    next();
    
  } catch (error) {
    logger.error('AB test middleware error:', error);
    // 出错时不影响正常流程
    next();
  }
};

// 生成会话ID
function generateSessionId() {
  return 'ab_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// 为会话分配变体
function assignVariant(abTest, sessionId, requestedPageId) {
  // 找到包含请求页面的变体
  const requestedVariant = abTest.variants.find(v => 
    (v.landingPageId._id || v.landingPageId).toString() === requestedPageId
  );
  
  if (!requestedVariant) {
    // 如果没找到对应变体，使用权重分配
    return assignVariantByWeight(abTest, sessionId);
  }
  
  // 基于会话ID进行一致性哈希分配
  const hash = hashCode(sessionId + abTest._id);
  const random = Math.abs(hash) % 100;
  
  let cumulativeWeight = 0;
  for (const variant of abTest.variants) {
    cumulativeWeight += variant.weight;
    if (random < cumulativeWeight) {
      return variant;
    }
  }
  
  // 兜底返回第一个变体
  return abTest.variants[0];
}

// 基于权重分配变体
function assignVariantByWeight(abTest, sessionId) {
  const hash = hashCode(sessionId + abTest._id);
  const random = Math.abs(hash) % 100;
  
  let cumulativeWeight = 0;
  for (const variant of abTest.variants) {
    cumulativeWeight += variant.weight;
    if (random < cumulativeWeight) {
      return variant;
    }
  }
  
  return abTest.variants[0];
}

// 获取会话的变体分配（检查是否已经分配过）
async function getVariantForSession(abTest, sessionId, pageId) {
  // 这里可以使用Redis或数据库来存储会话分配
  // 简化实现：基于sessionId的一致性哈希
  return assignVariant(abTest, sessionId, pageId);
}

// 记录访问事件
async function recordVisitEvent(testId, variantId, sessionId, req) {
  try {
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    // 异步记录事件，不阻塞主流程
    setImmediate(async () => {
      try {
        await fetch(`${req.protocol}://${req.get('host')}/api/ab-tests/${testId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            variantId: variantId,
            eventType: 'visit',
            sessionId: sessionId,
            metadata: {
              userAgent: userAgent,
              ip: ip,
              referrer: req.get('Referer') || '',
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (error) {
        logger.error('Failed to record AB test visit event:', error);
      }
    });
    
  } catch (error) {
    logger.error('Record visit event error:', error);
  }
}

// 哈希函数
function hashCode(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash;
}

// A/B测试统计中间件（在响应后记录事件）
const abTestStatsMiddleware = (req, res, next) => {
  // 监听响应结束事件
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    // 调用原始的end方法
    originalEnd.call(this, chunk, encoding);
    
    // 记录页面加载完成事件
    if (req.abTest && res.statusCode === 200) {
      setImmediate(async () => {
        try {
          // 记录页面加载时间
          const loadTime = Date.now() - req.startTime;
          
          await fetch(`${req.protocol}://${req.get('host')}/api/ab-tests/${req.abTest.testId}/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              variantId: req.abTest.variantId,
              eventType: 'page_load',
              sessionId: req.abTest.sessionId,
              value: loadTime,
              metadata: {
                timestamp: new Date().toISOString(),
                statusCode: res.statusCode
              }
            })
          });
        } catch (error) {
          logger.error('Failed to record AB test page load event:', error);
        }
      });
    }
  };
  
  next();
};

// 转化事件记录中间件
const recordConversionEvent = async (req, res) => {
  try {
    const { testId, variantId, sessionId, goalType, goalTarget, value = 1 } = req.body;
    
    if (!testId || !variantId || !sessionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // 验证测试是否存在且正在运行
    const abTest = await ABTest.findById(testId);
    if (!abTest || abTest.status !== 'running') {
      return res.status(404).json({ error: 'AB test not found or not running' });
    }
    
    // 验证目标是否匹配
    const matchingGoal = abTest.goals.find(goal => 
      goal.type === goalType && goal.target === goalTarget
    );
    
    if (!matchingGoal) {
      return res.status(400).json({ error: 'Goal not found in test' });
    }
    
    // 记录转化事件
    await fetch(`${req.protocol}://${req.get('host')}/api/ab-tests/${testId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variantId: variantId,
        eventType: 'conversion',
        sessionId: sessionId,
        value: value,
        metadata: {
          goalType: goalType,
          goalTarget: goalTarget,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      })
    });
    
    logger.logUserAction(null, 'ab_test_conversion', {
      testId,
      variantId,
      goalType,
      goalTarget,
      value
    });
    
    res.json({ message: 'Conversion event recorded successfully' });
    
  } catch (error) {
    logger.error('Record conversion event error:', error);
    res.status(500).json({ error: 'Failed to record conversion event' });
  }
};

module.exports = {
  abTestMiddleware,
  abTestStatsMiddleware,
  recordConversionEvent
};