const Bull = require('bull');
const logger = require('./logger');
const cacheManager = require('./cacheManager');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0
    };
    
    this.isInitialized = false;
    this.processors = new Map();
    
    this.init();
  }

  // 初始化队列系统
  async init() {
    try {
      // 创建各种队列
      this.createQueue('analytics', {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.createQueue('automation', {
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      });

      this.createQueue('email', {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 5000
          }
        }
      });

      this.createQueue('reports', {
        defaultJobOptions: {
          removeOnComplete: 20,
          removeOnFail: 10,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 10000
          }
        }
      });

      this.createQueue('cleanup', {
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 1
        }
      });

      this.createQueue('export', {
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 2
        }
      });

      // 设置处理器
      this.setupProcessors();
      
      this.isInitialized = true;
      logger.info('Queue system initialized');
      
    } catch (error) {
      logger.error('Failed to initialize queue system:', error);
    }
  }

  // 创建队列
  createQueue(name, options = {}) {
    try {
      const queue = new Bull(name, {
        redis: this.redisConfig,
        ...options
      });

      // 事件监听
      queue.on('completed', (job, result) => {
        logger.debug(`Job completed: ${job.id} in queue ${name}`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job failed: ${job.id} in queue ${name}:`, err);
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job stalled: ${job.id} in queue ${name}`);
      });

      queue.on('progress', (job, progress) => {
        logger.debug(`Job progress: ${job.id} in queue ${name}: ${progress}%`);
      });

      this.queues.set(name, queue);
      logger.info(`Queue created: ${name}`);
      
      return queue;
    } catch (error) {
      logger.error(`Failed to create queue ${name}:`, error);
      return null;
    }
  }

  // 获取队列
  getQueue(name) {
    return this.queues.get(name);
  }

  // 添加任务到队列
  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.getQueue(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(jobType, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        removeOnComplete: options.removeOnComplete || true,
        removeOnFail: options.removeOnFail || false,
        ...options
      });

      logger.debug(`Job added: ${job.id} to queue ${queueName}`);
      return job;
      
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  // 设置处理器
  setupProcessors() {
    // 分析数据处理器
    this.setProcessor('analytics', 'page_view', this.processPageView.bind(this));
    this.setProcessor('analytics', 'conversion', this.processConversion.bind(this));
    this.setProcessor('analytics', 'ab_test_event', this.processABTestEvent.bind(this));

    // 自动化处理器
    this.setProcessor('automation', 'execute_rule', this.processAutomationRule.bind(this));
    this.setProcessor('automation', 'send_notification', this.processSendNotification.bind(this));

    // 邮件处理器
    this.setProcessor('email', 'send_email', this.processSendEmail.bind(this));
    this.setProcessor('email', 'send_bulk_email', this.processSendBulkEmail.bind(this));

    // 报告处理器
    this.setProcessor('reports', 'generate_report', this.processGenerateReport.bind(this));
    this.setProcessor('reports', 'export_data', this.processExportData.bind(this));

    // 清理处理器
    this.setProcessor('cleanup', 'clean_logs', this.processCleanLogs.bind(this));
    this.setProcessor('cleanup', 'clean_cache', this.processCleanCache.bind(this));
  }

  // 设置处理器
  setProcessor(queueName, jobType, processor, concurrency = 1) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      logger.error(`Queue ${queueName} not found`);
      return;
    }

    const processorKey = `${queueName}:${jobType}`;
    this.processors.set(processorKey, processor);

    queue.process(jobType, concurrency, async (job) => {
      try {
        job.progress(0);
        const result = await processor(job);
        job.progress(100);
        return result;
      } catch (error) {
        logger.error(`Processor error for ${processorKey}:`, error);
        throw error;
      }
    });

    logger.debug(`Processor set: ${processorKey}`);
  }

  // 分析数据处理器实现
  async processPageView(job) {
    const { pageId, userId, sessionId, userAgent, ip, referrer } = job.data;
    
    try {
      // 更新页面访问统计
      await cacheManager.incr(`page_views:${pageId}:${new Date().toISOString().split('T')[0]}`);
      
      // 更新用户活动
      if (userId) {
        await cacheManager.incr(`user_activity:${userId}:${new Date().toISOString().split('T')[0]}`);
      }
      
      logger.debug(`Processed page view: ${pageId}`);
      return { status: 'processed', pageId };
      
    } catch (error) {
      logger.error('Process page view error:', error);
      throw error;
    }
  }

  async processConversion(job) {
    const { pageId, userId, sessionId, conversionType, value } = job.data;
    
    try {
      // 更新转化统计
      await cacheManager.incr(`conversions:${pageId}:${new Date().toISOString().split('T')[0]}`);
      
      // 更新收入统计
      if (value) {
        const revenueKey = `revenue:${pageId}:${new Date().toISOString().split('T')[0]}`;
        const currentRevenue = await cacheManager.get(revenueKey) || 0;
        await cacheManager.set(revenueKey, currentRevenue + value, 86400);
      }
      
      logger.debug(`Processed conversion: ${pageId}, type: ${conversionType}`);
      return { status: 'processed', pageId, conversionType };
      
    } catch (error) {
      logger.error('Process conversion error:', error);
      throw error;
    }
  }

  async processABTestEvent(job) {
    const { testId, variantId, eventType, sessionId, value } = job.data;
    
    try {
      // 这里应该更新A/B测试统计
      const statsKey = `ab_test:${testId}:${variantId}:${eventType}`;
      await cacheManager.incr(statsKey);
      
      logger.debug(`Processed AB test event: ${testId}, variant: ${variantId}, event: ${eventType}`);
      return { status: 'processed', testId, variantId, eventType };
      
    } catch (error) {
      logger.error('Process AB test event error:', error);
      throw error;
    }
  }

  // 自动化处理器实现
  async processAutomationRule(job) {
    const { ruleId, context } = job.data;
    
    try {
      job.progress(10);
      
      // 这里应该执行自动化规则
      // 模拟处理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      job.progress(50);
      
      // 模拟完成处理
      await new Promise(resolve => setTimeout(resolve, 500));
      
      job.progress(100);
      
      logger.debug(`Processed automation rule: ${ruleId}`);
      return { status: 'executed', ruleId };
      
    } catch (error) {
      logger.error('Process automation rule error:', error);
      throw error;
    }
  }

  async processSendNotification(job) {
    const { type, recipient, message, data } = job.data;
    
    try {
      // 这里应该发送通知
      logger.debug(`Processed notification: ${type} to ${recipient}`);
      return { status: 'sent', type, recipient };
      
    } catch (error) {
      logger.error('Process send notification error:', error);
      throw error;
    }
  }

  // 邮件处理器实现
  async processSendEmail(job) {
    const { to, subject, content, attachments } = job.data;
    
    try {
      job.progress(25);
      
      // 这里应该发送邮件
      // 模拟邮件发送
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      job.progress(100);
      
      logger.debug(`Processed email: ${subject} to ${to}`);
      return { status: 'sent', to, subject };
      
    } catch (error) {
      logger.error('Process send email error:', error);
      throw error;
    }
  }

  async processSendBulkEmail(job) {
    const { recipients, subject, content } = job.data;
    
    try {
      const total = recipients.length;
      let sent = 0;
      
      for (const recipient of recipients) {
        // 发送单个邮件
        await new Promise(resolve => setTimeout(resolve, 100));
        sent++;
        job.progress(Math.round((sent / total) * 100));
      }
      
      logger.debug(`Processed bulk email: ${subject} to ${total} recipients`);
      return { status: 'sent', total, sent };
      
    } catch (error) {
      logger.error('Process send bulk email error:', error);
      throw error;
    }
  }

  // 报告处理器实现
  async processGenerateReport(job) {
    const { reportType, parameters, userId } = job.data;
    
    try {
      job.progress(10);
      
      // 模拟报告生成
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      job.progress(50);
      
      // 模拟数据处理
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      job.progress(90);
      
      // 模拟文件保存
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      job.progress(100);
      
      const reportUrl = `/reports/${reportType}_${Date.now()}.pdf`;
      
      logger.debug(`Generated report: ${reportType} for user ${userId}`);
      return { status: 'generated', reportType, url: reportUrl };
      
    } catch (error) {
      logger.error('Process generate report error:', error);
      throw error;
    }
  }

  async processExportData(job) {
    const { dataType, format, filters, userId } = job.data;
    
    try {
      job.progress(20);
      
      // 模拟数据导出
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      job.progress(80);
      
      // 模拟文件生成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      job.progress(100);
      
      const exportUrl = `/exports/${dataType}_${Date.now()}.${format}`;
      
      logger.debug(`Exported data: ${dataType} in ${format} for user ${userId}`);
      return { status: 'exported', dataType, format, url: exportUrl };
      
    } catch (error) {
      logger.error('Process export data error:', error);
      throw error;
    }
  }

  // 清理处理器实现
  async processCleanLogs(job) {
    const { olderThan, logTypes } = job.data;
    
    try {
      // 模拟日志清理
      let cleaned = 0;
      
      for (const logType of logTypes) {
        await new Promise(resolve => setTimeout(resolve, 500));
        cleaned += Math.floor(Math.random() * 100);
        job.progress((logTypes.indexOf(logType) + 1) / logTypes.length * 100);
      }
      
      logger.debug(`Cleaned logs: ${cleaned} entries`);
      return { status: 'cleaned', cleaned };
      
    } catch (error) {
      logger.error('Process clean logs error:', error);
      throw error;
    }
  }

  async processCleanCache(job) {
    const { pattern, maxAge } = job.data;
    
    try {
      // 执行缓存清理
      const cleaned = await cacheManager.cleanup();
      
      logger.debug(`Cleaned cache: ${cleaned} keys`);
      return { status: 'cleaned', cleaned };
      
    } catch (error) {
      logger.error('Process clean cache error:', error);
      throw error;
    }
  }

  // 便捷方法
  async addAnalyticsJob(type, data, options = {}) {
    return this.addJob('analytics', type, data, options);
  }

  async addAutomationJob(type, data, options = {}) {
    return this.addJob('automation', type, data, options);
  }

  async addEmailJob(type, data, options = {}) {
    return this.addJob('email', type, data, options);
  }

  async addReportJob(type, data, options = {}) {
    return this.addJob('reports', type, data, options);
  }

  async addCleanupJob(type, data, options = {}) {
    return this.addJob('cleanup', type, data, options);
  }

  // 获取队列统计
  async getQueueStats(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      return null;
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    } catch (error) {
      logger.error(`Get queue stats error for ${queueName}:`, error);
      return null;
    }
  }

  // 获取所有队列统计
  async getAllStats() {
    const stats = {};
    
    for (const [name] of this.queues) {
      stats[name] = await this.getQueueStats(name);
    }
    
    return stats;
  }

  // 清空队列
  async clearQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
    logger.info(`Queue cleared: ${queueName}`);
  }

  // 暂停队列
  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
  }

  // 恢复队列
  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
  }

  // 关闭所有队列
  async close() {
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    
    this.queues.clear();
    this.processors.clear();
    this.isInitialized = false;
    
    logger.info('Queue system closed');
  }
}

// 单例实例
const queueManager = new QueueManager();

module.exports = queueManager;