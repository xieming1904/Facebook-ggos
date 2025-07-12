const express = require('express');
const auth = require('../middleware/auth');
const AutomationRule = require('../models/AutomationRule');
const automationEngine = require('../utils/automationEngine');
const logger = require('../utils/logger');

const router = express.Router();

// 获取自动化规则列表
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      triggerType, 
      search 
    } = req.query;
    
    const filter = {};
    
    // 状态过滤
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }
    
    // 触发类型过滤
    if (triggerType) {
      filter['trigger.type'] = triggerType;
    }
    
    // 搜索过滤
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 分页查询
    const skip = (page - 1) * limit;
    const rules = await AutomationRule.find(filter)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await AutomationRule.countDocuments(filter);
    
    res.json({
      rules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get automation rules error:', error);
    res.status(500).json({ error: 'Failed to get automation rules' });
  }
});

// 获取单个自动化规则
router.get('/:id', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    res.json({ rule });
  } catch (error) {
    logger.error('Get automation rule error:', error);
    res.status(500).json({ error: 'Failed to get automation rule' });
  }
});

// 创建自动化规则
router.post('/', auth, async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      createdBy: req.user.userId
    };
    
    const rule = new AutomationRule(ruleData);
    await rule.save();
    
    // 如果是定时规则且激活状态，添加到调度器
    if (rule.isActive && rule.trigger.type === 'schedule') {
      await automationEngine.scheduleRule(rule);
    }
    
    logger.logUserAction(req.user.userId, 'create_automation_rule', {
      ruleId: rule._id,
      name: rule.name,
      triggerType: rule.trigger.type
    });
    
    res.status(201).json({ 
      message: 'Automation rule created successfully',
      rule
    });
  } catch (error) {
    logger.error('Create automation rule error:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// 更新自动化规则
router.put('/:id', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    const wasScheduled = rule.isActive && rule.trigger.type === 'schedule';
    
    // 更新规则
    Object.assign(rule, req.body);
    rule.updatedBy = req.user.userId;
    await rule.save();
    
    // 处理定时规则的调度更新
    if (wasScheduled && automationEngine.scheduledTasks.has(rule._id.toString())) {
      // 删除旧的调度任务
      const oldTask = automationEngine.scheduledTasks.get(rule._id.toString());
      oldTask.destroy();
      automationEngine.scheduledTasks.delete(rule._id.toString());
    }
    
    // 如果规则激活且为定时规则，重新调度
    if (rule.isActive && rule.trigger.type === 'schedule') {
      await automationEngine.scheduleRule(rule);
    }
    
    logger.logUserAction(req.user.userId, 'update_automation_rule', {
      ruleId: rule._id,
      name: rule.name
    });
    
    res.json({ 
      message: 'Automation rule updated successfully',
      rule
    });
  } catch (error) {
    logger.error('Update automation rule error:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

// 删除自动化规则
router.delete('/:id', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    // 如果是定时规则，从调度器中删除
    if (rule.trigger.type === 'schedule' && automationEngine.scheduledTasks.has(rule._id.toString())) {
      const task = automationEngine.scheduledTasks.get(rule._id.toString());
      task.destroy();
      automationEngine.scheduledTasks.delete(rule._id.toString());
    }
    
    await AutomationRule.findByIdAndDelete(req.params.id);
    
    logger.logUserAction(req.user.userId, 'delete_automation_rule', {
      ruleId: req.params.id,
      name: rule.name
    });
    
    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    logger.error('Delete automation rule error:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

// 激活/禁用自动化规则
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    const wasActive = rule.isActive;
    rule.isActive = !rule.isActive;
    rule.updatedBy = req.user.userId;
    await rule.save();
    
    // 处理定时规则的调度
    if (rule.trigger.type === 'schedule') {
      if (rule.isActive && !wasActive) {
        // 激活：添加到调度器
        await automationEngine.scheduleRule(rule);
      } else if (!rule.isActive && wasActive) {
        // 禁用：从调度器移除
        const task = automationEngine.scheduledTasks.get(rule._id.toString());
        if (task) {
          task.destroy();
          automationEngine.scheduledTasks.delete(rule._id.toString());
        }
      }
    }
    
    logger.logUserAction(req.user.userId, 'toggle_automation_rule', {
      ruleId: rule._id,
      name: rule.name,
      isActive: rule.isActive
    });
    
    res.json({ 
      message: `Automation rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      rule
    });
  } catch (error) {
    logger.error('Toggle automation rule error:', error);
    res.status(500).json({ error: 'Failed to toggle automation rule' });
  }
});

// 手动执行自动化规则
router.post('/:id/execute', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    // 手动执行规则
    await automationEngine.executeRule(rule, { 
      trigger: 'manual',
      executedBy: req.user.userId,
      executedAt: new Date()
    });
    
    logger.logUserAction(req.user.userId, 'execute_automation_rule', {
      ruleId: rule._id,
      name: rule.name
    });
    
    res.json({ message: 'Automation rule executed successfully' });
  } catch (error) {
    logger.error('Execute automation rule error:', error);
    res.status(500).json({ error: 'Failed to execute automation rule' });
  }
});

// 获取规则执行历史
router.get('/:id/executions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    // 分页获取执行历史
    const skip = (page - 1) * limit;
    const executions = rule.executions
      .sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt))
      .slice(skip, skip + parseInt(limit));
    
    res.json({
      executions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: rule.executions.length,
        pages: Math.ceil(rule.executions.length / limit)
      }
    });
  } catch (error) {
    logger.error('Get rule executions error:', error);
    res.status(500).json({ error: 'Failed to get rule executions' });
  }
});

// 获取规则统计信息
router.get('/:id/statistics', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    // 计算详细统计信息
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const statistics = {
      overall: {
        totalExecutions: rule.statistics.totalExecutions,
        successfulExecutions: rule.statistics.successfulExecutions,
        failedExecutions: rule.statistics.failedExecutions,
        successRate: rule.successRate,
        averageDuration: rule.statistics.averageDuration,
        lastExecutedAt: rule.statistics.lastExecutedAt,
        lastStatus: rule.statistics.lastStatus
      },
      recent: {
        last24Hours: rule.executions.filter(e => e.triggeredAt >= last24Hours).length,
        last7Days: rule.executions.filter(e => e.triggeredAt >= last7Days).length,
        last30Days: rule.executions.filter(e => e.triggeredAt >= last30Days).length
      },
      statusDistribution: {
        success: rule.executions.filter(e => e.status === 'success').length,
        failed: rule.executions.filter(e => e.status === 'failed').length,
        timeout: rule.executions.filter(e => e.status === 'timeout').length,
        skipped: rule.executions.filter(e => e.status === 'skipped').length
      }
    };
    
    res.json({ statistics });
  } catch (error) {
    logger.error('Get rule statistics error:', error);
    res.status(500).json({ error: 'Failed to get rule statistics' });
  }
});

// 复制自动化规则
router.post('/:id/clone', auth, async (req, res) => {
  try {
    const originalRule = await AutomationRule.findById(req.params.id);
    
    if (!originalRule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    const clonedRule = new AutomationRule({
      ...originalRule.toObject(),
      _id: undefined,
      name: `${originalRule.name} - 副本`,
      isActive: false, // 默认禁用
      executions: [],
      statistics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        lastExecutedAt: undefined,
        averageDuration: 0,
        lastStatus: undefined
      },
      createdBy: req.user.userId,
      updatedBy: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await clonedRule.save();
    
    logger.logUserAction(req.user.userId, 'clone_automation_rule', {
      originalId: req.params.id,
      clonedId: clonedRule._id,
      name: clonedRule.name
    });
    
    res.status(201).json({ 
      message: 'Automation rule cloned successfully',
      rule: clonedRule
    });
  } catch (error) {
    logger.error('Clone automation rule error:', error);
    res.status(500).json({ error: 'Failed to clone automation rule' });
  }
});

// 测试自动化规则
router.post('/:id/test', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }
    
    const testData = req.body.testData || {};
    
    // 测试规则条件
    const conditionResult = rule.evaluateFilters(testData);
    
    // 测试动作（只做验证，不实际执行）
    const actionResults = [];
    for (const action of rule.actions) {
      const actionTest = {
        type: action.type,
        valid: true,
        message: 'Action configuration is valid'
      };
      
      // 验证动作配置
      try {
        switch (action.type) {
          case 'send_email':
            if (!action.email || !action.email.to || action.email.to.length === 0) {
              actionTest.valid = false;
              actionTest.message = 'Email recipients are required';
            }
            break;
          case 'webhook_call':
            if (!action.webhook || !action.webhook.url) {
              actionTest.valid = false;
              actionTest.message = 'Webhook URL is required';
            }
            break;
          case 'send_slack':
            if (!action.slack || (!action.slack.webhook_url && !action.slack.channel)) {
              actionTest.valid = false;
              actionTest.message = 'Slack webhook URL or channel is required';
            }
            break;
        }
      } catch (error) {
        actionTest.valid = false;
        actionTest.message = error.message;
      }
      
      actionResults.push(actionTest);
    }
    
    const testResult = {
      rule: {
        id: rule._id,
        name: rule.name,
        isActive: rule.isActive
      },
      condition: {
        passed: conditionResult,
        message: conditionResult ? 'All conditions passed' : 'Conditions not met'
      },
      actions: actionResults,
      overall: {
        valid: actionResults.every(a => a.valid),
        executable: conditionResult && actionResults.every(a => a.valid)
      }
    };
    
    logger.logUserAction(req.user.userId, 'test_automation_rule', {
      ruleId: rule._id,
      testResult: testResult.overall
    });
    
    res.json({ testResult });
  } catch (error) {
    logger.error('Test automation rule error:', error);
    res.status(500).json({ error: 'Failed to test automation rule' });
  }
});

// 获取自动化规则模板
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = [
      {
        id: 'high-traffic-alert',
        name: '高流量告警',
        description: '当网站流量超过阈值时发送告警通知',
        template: {
          trigger: {
            type: 'condition',
            condition: {
              metric: 'traffic_volume',
              operator: '>',
              value: 1000,
              timeframe: '1hour'
            }
          },
          actions: [
            {
              type: 'send_email',
              email: {
                to: ['admin@example.com'],
                subject: '网站流量告警',
                template: '<h2>流量告警</h2><p>当前网站流量: {{traffic_volume}} (超过阈值: {{threshold}})</p>'
              }
            }
          ]
        }
      },
      {
        id: 'low-conversion-alert',
        name: '低转化率告警',
        description: '当转化率低于阈值时发送告警通知',
        template: {
          trigger: {
            type: 'condition',
            condition: {
              metric: 'conversion_rate',
              operator: '<',
              value: 2.0,
              timeframe: '1hour'
            }
          },
          actions: [
            {
              type: 'send_slack',
              slack: {
                webhook_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
                message: '🚨 转化率告警: 当前转化率 {{conversion_rate}}% (低于阈值 {{threshold}}%)'
              }
            }
          ]
        }
      },
      {
        id: 'daily-backup',
        name: '每日数据备份',
        description: '每天凌晨自动备份数据',
        template: {
          trigger: {
            type: 'schedule',
            schedule: {
              cron: '0 2 * * *',
              timezone: 'Asia/Shanghai'
            }
          },
          actions: [
            {
              type: 'backup_data',
              system: {
                command: 'backup',
                parameters: {
                  type: 'full',
                  retention: 7
                }
              }
            },
            {
              type: 'send_email',
              email: {
                to: ['admin@example.com'],
                subject: '数据备份完成',
                template: '<p>每日数据备份已完成，备份时间: {{now}}</p>'
              }
            }
          ]
        }
      },
      {
        id: 'ab-test-completion',
        name: 'A/B测试完成通知',
        description: '当A/B测试完成时发送通知',
        template: {
          trigger: {
            type: 'event',
            event: 'ab_test_completed'
          },
          actions: [
            {
              type: 'send_email',
              email: {
                to: ['marketing@example.com'],
                subject: 'A/B测试完成 - {{test_name}}',
                template: '<h2>A/B测试完成</h2><p>测试名称: {{test_name}}</p><p>获胜变体: {{winner}}</p><p>改进幅度: {{improvement}}%</p>'
              }
            }
          ]
        }
      }
    ];
    
    res.json({ templates });
  } catch (error) {
    logger.error('Get automation rule templates error:', error);
    res.status(500).json({ error: 'Failed to get automation rule templates' });
  }
});

// 获取自动化引擎状态
router.get('/engine/status', auth, async (req, res) => {
  try {
    const status = {
      isRunning: automationEngine.isRunning,
      scheduledTasks: automationEngine.scheduledTasks.size,
      engineUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastHealthCheck: new Date().toISOString()
    };
    
    res.json({ status });
  } catch (error) {
    logger.error('Get automation engine status error:', error);
    res.status(500).json({ error: 'Failed to get automation engine status' });
  }
});

// 重启自动化引擎
router.post('/engine/restart', auth, async (req, res) => {
  try {
    await automationEngine.stop();
    await automationEngine.start();
    
    logger.logUserAction(req.user.userId, 'restart_automation_engine', {
      timestamp: new Date().toISOString()
    });
    
    res.json({ message: 'Automation engine restarted successfully' });
  } catch (error) {
    logger.error('Restart automation engine error:', error);
    res.status(500).json({ error: 'Failed to restart automation engine' });
  }
});

module.exports = router;