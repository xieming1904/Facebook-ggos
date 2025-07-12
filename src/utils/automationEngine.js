const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { WebClient } = require('@slack/web-api');
const AutomationRule = require('../models/AutomationRule');
const logger = require('./logger');

class AutomationEngine {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
    this.eventHandlers = new Map();
    this.mailTransporter = null;
    this.slackClient = null;
    
    this.initializeEmailTransporter();
    this.initializeSlackClient();
    this.setupEventHandlers();
  }

  // 初始化邮件发送器
  initializeEmailTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.mailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  // 初始化Slack客户端
  initializeSlackClient() {
    if (process.env.SLACK_BOT_TOKEN) {
      this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    }
  }

  // 设置事件处理器
  setupEventHandlers() {
    this.eventHandlers.set('page_visit', this.handlePageVisitEvent.bind(this));
    this.eventHandlers.set('conversion', this.handleConversionEvent.bind(this));
    this.eventHandlers.set('ab_test_completed', this.handleABTestCompletedEvent.bind(this));
    this.eventHandlers.set('domain_down', this.handleDomainDownEvent.bind(this));
    this.eventHandlers.set('high_traffic', this.handleHighTrafficEvent.bind(this));
    this.eventHandlers.set('low_conversion', this.handleLowConversionEvent.bind(this));
    this.eventHandlers.set('cloak_detected', this.handleCloakDetectedEvent.bind(this));
    this.eventHandlers.set('user_login', this.handleUserLoginEvent.bind(this));
    this.eventHandlers.set('system_error', this.handleSystemErrorEvent.bind(this));
  }

  // 启动自动化引擎
  async start() {
    if (this.isRunning) {
      logger.warn('Automation engine is already running');
      return;
    }

    try {
      this.isRunning = true;
      await this.loadScheduledRules();
      await this.startConditionMonitoring();
      
      logger.info('Automation engine started successfully');
    } catch (error) {
      logger.error('Failed to start automation engine:', error);
      this.isRunning = false;
      throw error;
    }
  }

  // 停止自动化引擎
  async stop() {
    if (!this.isRunning) {
      logger.warn('Automation engine is not running');
      return;
    }

    try {
      // 停止所有定时任务
      for (const [ruleId, task] of this.scheduledTasks) {
        task.destroy();
      }
      this.scheduledTasks.clear();

      // 停止条件监控
      if (this.conditionMonitorInterval) {
        clearInterval(this.conditionMonitorInterval);
      }

      this.isRunning = false;
      logger.info('Automation engine stopped successfully');
    } catch (error) {
      logger.error('Failed to stop automation engine:', error);
      throw error;
    }
  }

  // 加载定时规则
  async loadScheduledRules() {
    try {
      const scheduledRules = await AutomationRule.findActiveRules('schedule');
      
      for (const rule of scheduledRules) {
        await this.scheduleRule(rule);
      }
      
      logger.info(`Loaded ${scheduledRules.length} scheduled rules`);
    } catch (error) {
      logger.error('Failed to load scheduled rules:', error);
      throw error;
    }
  }

  // 调度单个规则
  async scheduleRule(rule) {
    try {
      if (!rule.trigger.schedule?.cron) {
        logger.warn(`Rule ${rule._id} has no cron expression`);
        return;
      }

      const task = cron.schedule(rule.trigger.schedule.cron, async () => {
        await this.executeRule(rule, { trigger: 'schedule' });
      }, {
        scheduled: true,
        timezone: rule.trigger.schedule.timezone || 'Asia/Shanghai'
      });

      this.scheduledTasks.set(rule._id.toString(), task);
      logger.info(`Scheduled rule: ${rule.name} (${rule.trigger.schedule.cron})`);
    } catch (error) {
      logger.error(`Failed to schedule rule ${rule._id}:`, error);
    }
  }

  // 开始条件监控
  async startConditionMonitoring() {
    // 每分钟检查一次条件规则
    this.conditionMonitorInterval = setInterval(async () => {
      await this.checkConditionRules();
    }, 60000); // 1分钟

    logger.info('Started condition monitoring');
  }

  // 检查条件规则
  async checkConditionRules() {
    try {
      const conditionRules = await AutomationRule.findActiveRules('condition');
      
      for (const rule of conditionRules) {
        if (!rule.canExecute()) continue;
        
        const conditionMet = await this.evaluateCondition(rule);
        if (conditionMet) {
          await this.executeRule(rule, { trigger: 'condition' });
        }
      }
    } catch (error) {
      logger.error('Failed to check condition rules:', error);
    }
  }

  // 评估条件
  async evaluateCondition(rule) {
    try {
      const condition = rule.trigger.condition;
      if (!condition) return false;

      // 获取指标数据
      const metricValue = await this.getMetricValue(condition.metric, condition.timeframe);
      
      // 评估条件
      return this.compareValues(metricValue, condition.operator, condition.value);
    } catch (error) {
      logger.error(`Failed to evaluate condition for rule ${rule._id}:`, error);
      return false;
    }
  }

  // 获取指标值
  async getMetricValue(metric, timeframe) {
    const timeMs = this.parseTimeframe(timeframe);
    const startTime = new Date(Date.now() - timeMs);
    const endTime = new Date();

    switch (metric) {
      case 'conversion_rate':
        return await this.getConversionRate(startTime, endTime);
      case 'traffic_volume':
        return await this.getTrafficVolume(startTime, endTime);
      case 'page_load_time':
        return await this.getAveragePageLoadTime(startTime, endTime);
      case 'error_rate':
        return await this.getErrorRate(startTime, endTime);
      case 'revenue':
        return await this.getRevenue(startTime, endTime);
      case 'ab_test_significance':
        return await this.getABTestSignificance(startTime, endTime);
      default:
        return 0;
    }
  }

  // 解析时间范围
  parseTimeframe(timeframe) {
    const timeMap = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '6hour': 6 * 60 * 60 * 1000,
      '24hour': 24 * 60 * 60 * 1000,
      '7day': 7 * 24 * 60 * 60 * 1000
    };
    return timeMap[timeframe] || timeMap['1hour'];
  }

  // 比较值
  compareValues(actual, operator, expected) {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '==': return actual == expected;
      case '!=': return actual != expected;
      case 'contains': return String(actual).includes(String(expected));
      case 'not_contains': return !String(actual).includes(String(expected));
      default: return false;
    }
  }

  // 触发事件
  async triggerEvent(eventType, eventData) {
    try {
      // 查找匹配的事件规则
      const eventRules = await AutomationRule.findActiveRules('event', eventType);
      
      for (const rule of eventRules) {
        if (!rule.canExecute()) continue;
        
        // 评估过滤条件
        if (!rule.evaluateFilters(eventData)) continue;
        
        // 执行规则
        await this.executeRule(rule, { trigger: 'event', eventData });
      }
      
      logger.info(`Triggered ${eventRules.length} rules for event: ${eventType}`);
    } catch (error) {
      logger.error(`Failed to trigger event ${eventType}:`, error);
    }
  }

  // 执行规则
  async executeRule(rule, context = {}) {
    const startTime = Date.now();
    const execution = {
      triggeredAt: new Date(),
      status: 'success',
      duration: 0,
      result: null,
      error: null,
      logs: []
    };

    try {
      logger.info(`Executing rule: ${rule.name} (${rule._id})`);
      execution.logs.push(`Started execution at ${execution.triggeredAt.toISOString()}`);

      // 执行所有动作
      const results = [];
      for (const action of rule.actions) {
        // 检查动作条件
        if (action.condition && !this.evaluateActionCondition(action.condition, context)) {
          execution.logs.push(`Skipped action ${action.type} due to condition`);
          continue;
        }

        // 延迟执行
        if (action.delay > 0) {
          execution.logs.push(`Delaying action ${action.type} for ${action.delay}s`);
          await this.sleep(action.delay * 1000);
        }

        // 执行动作
        const actionResult = await this.executeAction(action, context, rule);
        results.push(actionResult);
        execution.logs.push(`Executed action ${action.type}: ${actionResult.status}`);
      }

      execution.result = results;
      execution.duration = Date.now() - startTime;
      
      logger.info(`Rule execution completed: ${rule.name} (${execution.duration}ms)`);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.duration = Date.now() - startTime;
      
      logger.error(`Rule execution failed: ${rule.name}:`, error);
    }

    // 更新规则执行历史
    try {
      rule.addExecution(execution);
      await rule.save();
    } catch (error) {
      logger.error(`Failed to save execution history for rule ${rule._id}:`, error);
    }
  }

  // 评估动作条件
  evaluateActionCondition(condition, context) {
    if (!condition || !condition.field) return true;
    
    const fieldValue = this.getNestedValue(context, condition.field);
    return this.compareValues(fieldValue, condition.operator, condition.value);
  }

  // 执行动作
  async executeAction(action, context, rule) {
    try {
      switch (action.type) {
        case 'send_email':
          return await this.sendEmail(action.email, context, rule);
        case 'send_sms':
          return await this.sendSMS(action.sms, context, rule);
        case 'webhook_call':
          return await this.callWebhook(action.webhook, context, rule);
        case 'send_slack':
          return await this.sendSlackMessage(action.slack, context, rule);
        case 'pause_campaign':
          return await this.pauseCampaign(action.system, context, rule);
        case 'switch_page':
          return await this.switchPage(action.system, context, rule);
        case 'update_cloak_settings':
          return await this.updateCloakSettings(action.system, context, rule);
        case 'backup_data':
          return await this.backupData(action.system, context, rule);
        case 'restart_service':
          return await this.restartService(action.system, context, rule);
        case 'create_ticket':
          return await this.createTicket(action.system, context, rule);
        case 'auto_scale':
          return await this.autoScale(action.system, context, rule);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return {
        status: 'failed',
        error: error.message
      };
    }
  }

  // 发送邮件
  async sendEmail(emailConfig, context, rule) {
    if (!this.mailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const subject = this.replaceVariables(emailConfig.subject, context, rule);
    const htmlContent = this.replaceVariables(emailConfig.template, context, rule);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emailConfig.to.join(','),
      cc: emailConfig.cc ? emailConfig.cc.join(',') : undefined,
      subject: subject,
      html: htmlContent
    };

    const result = await this.mailTransporter.sendMail(mailOptions);
    
    return {
      status: 'success',
      messageId: result.messageId,
      recipients: emailConfig.to.length
    };
  }

  // 发送Slack消息
  async sendSlackMessage(slackConfig, context, rule) {
    if (!this.slackClient && !slackConfig.webhook_url) {
      throw new Error('Slack client or webhook URL not configured');
    }

    const message = this.replaceVariables(slackConfig.message, context, rule);

    if (slackConfig.webhook_url) {
      // 使用Webhook发送
      const response = await axios.post(slackConfig.webhook_url, {
        text: message,
        channel: slackConfig.channel,
        username: slackConfig.username || 'Automation Bot',
        icon_emoji: slackConfig.icon_emoji || ':robot_face:'
      });

      return {
        status: 'success',
        response: response.data
      };
    } else {
      // 使用Slack客户端
      const result = await this.slackClient.chat.postMessage({
        channel: slackConfig.channel,
        text: message,
        username: slackConfig.username || 'Automation Bot',
        icon_emoji: slackConfig.icon_emoji || ':robot_face:'
      });

      return {
        status: 'success',
        ts: result.ts
      };
    }
  }

  // 调用Webhook
  async callWebhook(webhookConfig, context, rule) {
    const url = this.replaceVariables(webhookConfig.url, context, rule);
    const body = this.replaceVariables(JSON.stringify(webhookConfig.body), context, rule);

    const response = await axios({
      method: webhookConfig.method || 'POST',
      url: url,
      headers: webhookConfig.headers || {},
      data: webhookConfig.method === 'GET' ? undefined : JSON.parse(body),
      timeout: webhookConfig.timeout || 30000
    });

    return {
      status: 'success',
      statusCode: response.status,
      data: response.data
    };
  }

  // 替换变量
  replaceVariables(template, context, rule) {
    if (!template) return '';

    let result = template.toString();
    
    // 替换系统变量
    result = result.replace(/\{\{now\}\}/g, new Date().toISOString());
    result = result.replace(/\{\{rule\.name\}\}/g, rule.name);
    result = result.replace(/\{\{rule\.id\}\}/g, rule._id.toString());
    
    // 替换上下文变量
    const variables = this.extractVariables(template);
    for (const variable of variables) {
      const value = this.getNestedValue(context, variable);
      if (value !== undefined) {
        const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
        result = result.replace(regex, value);
      }
    }
    
    return result;
  }

  // 提取模板变量
  extractVariables(template) {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      variables.push(match[1]);
    }
    
    return variables;
  }

  // 获取嵌套值
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // 睡眠函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取转化率（示例实现）
  async getConversionRate(startTime, endTime) {
    // 这里应该连接到您的分析数据库
    // 返回指定时间范围内的转化率
    return Math.random() * 10; // 示例返回0-10%的随机转化率
  }

  // 获取流量量（示例实现）
  async getTrafficVolume(startTime, endTime) {
    // 返回指定时间范围内的访问量
    return Math.floor(Math.random() * 1000); // 示例返回0-1000的随机访问量
  }

  // 获取平均页面加载时间（示例实现）
  async getAveragePageLoadTime(startTime, endTime) {
    // 返回指定时间范围内的平均页面加载时间（毫秒）
    return Math.random() * 3000 + 500; // 示例返回500-3500ms的随机加载时间
  }

  // 获取错误率（示例实现）
  async getErrorRate(startTime, endTime) {
    // 返回指定时间范围内的错误率
    return Math.random() * 5; // 示例返回0-5%的随机错误率
  }

  // 获取收入（示例实现）
  async getRevenue(startTime, endTime) {
    // 返回指定时间范围内的收入
    return Math.random() * 10000; // 示例返回0-10000的随机收入
  }

  // 获取A/B测试显著性（示例实现）
  async getABTestSignificance(startTime, endTime) {
    // 返回当前运行的A/B测试的最高显著性水平
    return Math.random() * 100; // 示例返回0-100%的随机显著性
  }

  // 事件处理器（示例实现）
  async handlePageVisitEvent(eventData) {
    logger.info('Handling page visit event:', eventData);
  }

  async handleConversionEvent(eventData) {
    logger.info('Handling conversion event:', eventData);
  }

  async handleABTestCompletedEvent(eventData) {
    logger.info('Handling AB test completed event:', eventData);
  }

  async handleDomainDownEvent(eventData) {
    logger.warn('Handling domain down event:', eventData);
  }

  async handleHighTrafficEvent(eventData) {
    logger.info('Handling high traffic event:', eventData);
  }

  async handleLowConversionEvent(eventData) {
    logger.warn('Handling low conversion event:', eventData);
  }

  async handleCloakDetectedEvent(eventData) {
    logger.info('Handling cloak detected event:', eventData);
  }

  async handleUserLoginEvent(eventData) {
    logger.info('Handling user login event:', eventData);
  }

  async handleSystemErrorEvent(eventData) {
    logger.error('Handling system error event:', eventData);
  }

  // 系统动作实现（示例）
  async pauseCampaign(config, context, rule) {
    logger.info('Pausing campaign:', config);
    return { status: 'success', message: 'Campaign paused' };
  }

  async switchPage(config, context, rule) {
    logger.info('Switching page:', config);
    return { status: 'success', message: 'Page switched' };
  }

  async updateCloakSettings(config, context, rule) {
    logger.info('Updating cloak settings:', config);
    return { status: 'success', message: 'Cloak settings updated' };
  }

  async backupData(config, context, rule) {
    logger.info('Backing up data:', config);
    return { status: 'success', message: 'Data backup initiated' };
  }

  async restartService(config, context, rule) {
    logger.info('Restarting service:', config);
    return { status: 'success', message: 'Service restart initiated' };
  }

  async createTicket(config, context, rule) {
    logger.info('Creating ticket:', config);
    return { status: 'success', message: 'Ticket created' };
  }

  async autoScale(config, context, rule) {
    logger.info('Auto scaling:', config);
    return { status: 'success', message: 'Auto scaling initiated' };
  }
}

// 单例实例
const automationEngine = new AutomationEngine();

module.exports = automationEngine;