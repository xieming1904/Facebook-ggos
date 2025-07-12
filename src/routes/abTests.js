const express = require('express');
const auth = require('../middleware/auth');
const ABTest = require('../models/ABTest');
const LandingPage = require('../models/LandingPage');
const logger = require('../utils/logger');

const router = express.Router();

// 获取A/B测试列表
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'variants.landingPageId', select: 'name type' },
        { path: 'createdBy', select: 'username' }
      ]
    };
    
    const abTests = await ABTest.paginate(filter, options);
    
    res.json({
      abTests: abTests.docs,
      totalPages: abTests.totalPages,
      totalTests: abTests.totalDocs,
      currentPage: abTests.page
    });
  } catch (error) {
    logger.error('Get AB tests error:', error);
    res.status(500).json({ error: 'Failed to get AB tests' });
  }
});

// 获取单个A/B测试
router.get('/:id', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id)
      .populate('variants.landingPageId', 'name type content.html')
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    res.json({ abTest });
  } catch (error) {
    logger.error('Get AB test error:', error);
    res.status(500).json({ error: 'Failed to get AB test' });
  }
});

// 创建A/B测试
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      config,
      variants,
      goals
    } = req.body;
    
    // 验证变体页面存在
    const landingPageIds = variants.map(v => v.landingPageId);
    const landingPages = await LandingPage.find({ _id: { $in: landingPageIds } });
    
    if (landingPages.length !== landingPageIds.length) {
      return res.status(400).json({ error: 'Some landing pages not found' });
    }
    
    // 验证权重总和
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      return res.status(400).json({ error: 'Variant weights must sum to 100' });
    }
    
    const abTest = new ABTest({
      name,
      description,
      type,
      config,
      variants,
      goals,
      createdBy: req.user.userId
    });
    
    await abTest.save();
    
    logger.logUserAction(req.user.userId, 'create_ab_test', { testId: abTest._id, name });
    
    res.status(201).json({ 
      message: 'AB test created successfully',
      abTest: await abTest.populate('variants.landingPageId', 'name type')
    });
  } catch (error) {
    logger.error('Create AB test error:', error);
    res.status(500).json({ error: 'Failed to create AB test' });
  }
});

// 更新A/B测试
router.put('/:id', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id);
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    // 如果测试正在运行，限制可修改的字段
    if (abTest.status === 'running') {
      const allowedFields = ['description', 'endDate'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      Object.assign(abTest, updateData);
    } else {
      // 测试未运行时可以修改所有字段
      const {
        name,
        description,
        type,
        config,
        variants,
        goals
      } = req.body;
      
      if (variants) {
        const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.1) {
          return res.status(400).json({ error: 'Variant weights must sum to 100' });
        }
      }
      
      Object.assign(abTest, {
        name: name || abTest.name,
        description: description || abTest.description,
        type: type || abTest.type,
        config: config || abTest.config,
        variants: variants || abTest.variants,
        goals: goals || abTest.goals
      });
    }
    
    abTest.updatedBy = req.user.userId;
    await abTest.save();
    
    logger.logUserAction(req.user.userId, 'update_ab_test', { testId: abTest._id });
    
    res.json({ 
      message: 'AB test updated successfully',
      abTest: await abTest.populate('variants.landingPageId', 'name type')
    });
  } catch (error) {
    logger.error('Update AB test error:', error);
    res.status(500).json({ error: 'Failed to update AB test' });
  }
});

// 启动A/B测试
router.post('/:id/start', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id);
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    if (abTest.status !== 'draft' && abTest.status !== 'paused') {
      return res.status(400).json({ error: 'Can only start draft or paused tests' });
    }
    
    // 验证测试配置
    if (abTest.variants.length < 2) {
      return res.status(400).json({ error: 'At least 2 variants required' });
    }
    
    if (abTest.goals.length === 0) {
      return res.status(400).json({ error: 'At least 1 goal required' });
    }
    
    abTest.status = 'running';
    abTest.startDate = new Date();
    abTest.endDate = new Date(Date.now() + abTest.config.duration * 24 * 60 * 60 * 1000);
    abTest.updatedBy = req.user.userId;
    
    // 初始化统计数据
    abTest.statistics = {
      totalVisitors: 0,
      variantStats: abTest.variants.map(variant => ({
        variantId: variant._id,
        visitors: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        avgSessionDuration: 0,
        bounceRate: 0
      }))
    };
    
    await abTest.save();
    
    logger.logUserAction(req.user.userId, 'start_ab_test', { testId: abTest._id });
    
    res.json({ 
      message: 'AB test started successfully',
      abTest
    });
  } catch (error) {
    logger.error('Start AB test error:', error);
    res.status(500).json({ error: 'Failed to start AB test' });
  }
});

// 暂停A/B测试
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id);
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    if (abTest.status !== 'running') {
      return res.status(400).json({ error: 'Can only pause running tests' });
    }
    
    abTest.status = 'paused';
    abTest.updatedBy = req.user.userId;
    await abTest.save();
    
    logger.logUserAction(req.user.userId, 'pause_ab_test', { testId: abTest._id });
    
    res.json({ 
      message: 'AB test paused successfully',
      abTest
    });
  } catch (error) {
    logger.error('Pause AB test error:', error);
    res.status(500).json({ error: 'Failed to pause AB test' });
  }
});

// 停止A/B测试
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id);
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    if (abTest.status !== 'running' && abTest.status !== 'paused') {
      return res.status(400).json({ error: 'Can only stop running or paused tests' });
    }
    
    abTest.status = 'completed';
    abTest.actualEndDate = new Date();
    abTest.updatedBy = req.user.userId;
    
    // 计算最终统计结果
    const stats = abTest.calculateStatistics();
    if (stats.significant) {
      abTest.statistics.winner = {
        variantId: stats.winner,
        confidenceLevel: abTest.config.confidenceLevel,
        improvement: stats.improvement
      };
    }
    
    await abTest.save();
    
    logger.logUserAction(req.user.userId, 'stop_ab_test', { testId: abTest._id });
    
    res.json({ 
      message: 'AB test stopped successfully',
      abTest,
      statistics: stats
    });
  } catch (error) {
    logger.error('Stop AB test error:', error);
    res.status(500).json({ error: 'Failed to stop AB test' });
  }
});

// 获取A/B测试统计数据
router.get('/:id/statistics', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id)
      .populate('variants.landingPageId', 'name');
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    const statistics = abTest.calculateStatistics();
    
    res.json({
      statistics: {
        ...abTest.statistics.toObject(),
        analysis: statistics
      }
    });
  } catch (error) {
    logger.error('Get AB test statistics error:', error);
    res.status(500).json({ error: 'Failed to get AB test statistics' });
  }
});

// 记录访问事件
router.post('/:id/events', async (req, res) => {
  try {
    const { variantId, eventType, sessionId, value = 1 } = req.body;
    const abTest = await ABTest.findById(req.params.id);
    
    if (!abTest || abTest.status !== 'running') {
      return res.status(404).json({ error: 'AB test not found or not running' });
    }
    
    const variantStats = abTest.statistics.variantStats.find(
      stat => stat.variantId.toString() === variantId
    );
    
    if (!variantStats) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }
    
    // 更新统计数据
    switch (eventType) {
      case 'visit':
        variantStats.visitors += 1;
        abTest.statistics.totalVisitors += 1;
        break;
      case 'conversion':
        variantStats.conversions += 1;
        variantStats.conversionRate = variantStats.conversions / variantStats.visitors;
        break;
      case 'revenue':
        variantStats.revenue += value;
        break;
    }
    
    await abTest.save();
    
    res.json({ message: 'Event recorded successfully' });
  } catch (error) {
    logger.error('Record AB test event error:', error);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// 删除A/B测试
router.delete('/:id', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id);
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    if (abTest.status === 'running') {
      return res.status(400).json({ error: 'Cannot delete running test' });
    }
    
    await ABTest.findByIdAndDelete(req.params.id);
    
    logger.logUserAction(req.user.userId, 'delete_ab_test', { testId: req.params.id });
    
    res.json({ message: 'AB test deleted successfully' });
  } catch (error) {
    logger.error('Delete AB test error:', error);
    res.status(500).json({ error: 'Failed to delete AB test' });
  }
});

// 复制A/B测试
router.post('/:id/clone', auth, async (req, res) => {
  try {
    const originalTest = await ABTest.findById(req.params.id);
    
    if (!originalTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    const clonedTest = new ABTest({
      ...originalTest.toObject(),
      _id: undefined,
      name: `${originalTest.name} - 副本`,
      status: 'draft',
      startDate: undefined,
      endDate: undefined,
      actualEndDate: undefined,
      statistics: {
        totalVisitors: 0,
        variantStats: [],
        winner: undefined
      },
      createdBy: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await clonedTest.save();
    
    logger.logUserAction(req.user.userId, 'clone_ab_test', { 
      originalId: req.params.id,
      clonedId: clonedTest._id 
    });
    
    res.status(201).json({ 
      message: 'AB test cloned successfully',
      abTest: clonedTest
    });
  } catch (error) {
    logger.error('Clone AB test error:', error);
    res.status(500).json({ error: 'Failed to clone AB test' });
  }
});

// 获取A/B测试报告
router.get('/:id/report', auth, async (req, res) => {
  try {
    const abTest = await ABTest.findById(req.params.id)
      .populate('variants.landingPageId', 'name type')
      .populate('createdBy', 'username');
    
    if (!abTest) {
      return res.status(404).json({ error: 'AB test not found' });
    }
    
    const statistics = abTest.calculateStatistics();
    
    const report = {
      testInfo: {
        name: abTest.name,
        description: abTest.description,
        status: abTest.status,
        duration: abTest.duration,
        startDate: abTest.startDate,
        endDate: abTest.endDate || abTest.actualEndDate
      },
      variants: abTest.variants.map(variant => {
        const stats = abTest.statistics.variantStats.find(
          s => s.variantId.toString() === variant._id.toString()
        );
        return {
          name: variant.name,
          landingPage: variant.landingPageId?.name,
          weight: variant.weight,
          isControl: variant.isControl,
          statistics: stats
        };
      }),
      goals: abTest.goals,
      results: statistics,
      summary: {
        totalVisitors: abTest.statistics.totalVisitors,
        hasWinner: !!abTest.statistics.winner,
        winner: abTest.statistics.winner,
        significant: statistics.significant,
        recommendation: statistics.significant ? 
          'Test shows statistically significant results' : 
          'Continue test or collect more data'
      }
    };
    
    res.json({ report });
  } catch (error) {
    logger.error('Get AB test report error:', error);
    res.status(500).json({ error: 'Failed to get AB test report' });
  }
});

module.exports = router;