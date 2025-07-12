const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const cacheManager = require('./cacheManager');
const queueManager = require('./queueManager');

class MonitoringSystem {
  constructor() {
    this.alerts = new Map();
    this.metrics = new Map();
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 3000 },
      errorRate: { warning: 5, critical: 10 },
      queueLength: { warning: 100, critical: 500 }
    };
    
    this.isRunning = false;
    this.interval = null;
    this.collectors = [];
    
    this.initCollectors();
  }

  // 初始化数据收集器
  initCollectors() {
    this.collectors = [
      this.collectSystemMetrics.bind(this),
      this.collectApplicationMetrics.bind(this),
      this.collectDatabaseMetrics.bind(this),
      this.collectCacheMetrics.bind(this),
      this.collectQueueMetrics.bind(this),
      this.collectNetworkMetrics.bind(this)
    ];
  }

  // 启动监控
  start(intervalMs = 30000) { // 默认30秒
    if (this.isRunning) {
      logger.warn('Monitoring system is already running');
      return;
    }

    this.isRunning = true;
    this.interval = setInterval(async () => {
      try {
        await this.collectAllMetrics();
        await this.checkThresholds();
      } catch (error) {
        logger.error('Monitoring error:', error);
      }
    }, intervalMs);

    logger.info('Monitoring system started');
  }

  // 停止监控
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.info('Monitoring system stopped');
  }

  // 收集所有指标
  async collectAllMetrics() {
    const timestamp = Date.now();
    const results = {};

    for (const collector of this.collectors) {
      try {
        const metrics = await collector();
        Object.assign(results, metrics);
      } catch (error) {
        logger.error('Metric collection error:', error);
      }
    }

    results.timestamp = timestamp;
    this.metrics.set(timestamp, results);

    // 存储到缓存
    await cacheManager.set('system_metrics', results, 300); // 5分钟TTL

    // 只保留最近1小时的数据
    const oneHourAgo = timestamp - (60 * 60 * 1000);
    for (const [ts] of this.metrics) {
      if (ts < oneHourAgo) {
        this.metrics.delete(ts);
      }
    }

    return results;
  }

  // 收集系统指标
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    // CPU使用率计算
    const cpuUsage = await this.getCPUUsage();

    // 磁盘使用情况
    const diskUsage = await this.getDiskUsage();

    return {
      system: {
        cpu: {
          cores: cpus.length,
          usage: cpuUsage,
          loadAvg: {
            '1m': loadAvg[0],
            '5m': loadAvg[1],
            '15m': loadAvg[2]
          }
        },
        memory: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem,
          usage: ((totalMem - freeMem) / totalMem) * 100
        },
        disk: diskUsage,
        uptime: uptime,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      }
    };
  }

  // 获取CPU使用率
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        resolve(percentageCPU);
      }, 1000);
    });
  }

  // CPU平均值计算
  cpuAverage() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    
    for (const cpu of cpus) {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    }

    const total = user + nice + sys + idle + irq;
    return { idle, total };
  }

  // 获取磁盘使用情况
  async getDiskUsage() {
    try {
      const stats = await fs.stat('.');
      // 这里可以添加更详细的磁盘统计
      return {
        usage: 0, // 占位符，实际实现需要使用系统命令
        total: 0,
        free: 0,
        used: 0
      };
    } catch (error) {
      logger.error('Disk usage collection error:', error);
      return { usage: 0, total: 0, free: 0, used: 0 };
    }
  }

  // 收集应用指标
  async collectApplicationMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      application: {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        uptime: uptime,
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  // 收集数据库指标
  async collectDatabaseMetrics() {
    try {
      const mongoose = require('mongoose');
      const connection = mongoose.connection;
      
      if (connection.readyState !== 1) {
        return {
          database: {
            connected: false,
            readyState: connection.readyState
          }
        };
      }

      // 获取数据库统计信息
      const admin = connection.db.admin();
      const dbStats = await admin.command({ dbStats: 1 });
      const serverStatus = await admin.command({ serverStatus: 1 });

      return {
        database: {
          connected: true,
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize,
          connections: serverStatus.connections,
          opcounters: serverStatus.opcounters,
          uptime: serverStatus.uptime
        }
      };
    } catch (error) {
      logger.error('Database metrics collection error:', error);
      return {
        database: {
          connected: false,
          error: error.message
        }
      };
    }
  }

  // 收集缓存指标
  async collectCacheMetrics() {
    try {
      const stats = await cacheManager.getStats();
      return {
        cache: {
          connected: cacheManager.isConnected,
          ...stats
        }
      };
    } catch (error) {
      logger.error('Cache metrics collection error:', error);
      return {
        cache: {
          connected: false,
          error: error.message
        }
      };
    }
  }

  // 收集队列指标
  async collectQueueMetrics() {
    try {
      const stats = await queueManager.getAllStats();
      return {
        queues: stats
      };
    } catch (error) {
      logger.error('Queue metrics collection error:', error);
      return {
        queues: {
          error: error.message
        }
      };
    }
  }

  // 收集网络指标
  async collectNetworkMetrics() {
    const networkInterfaces = os.networkInterfaces();
    const interfaces = {};

    for (const [name, nets] of Object.entries(networkInterfaces)) {
      interfaces[name] = nets.filter(net => !net.internal);
    }

    return {
      network: {
        interfaces,
        // 这里可以添加网络流量统计
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0
      }
    };
  }

  // 检查阈值
  async checkThresholds() {
    const latestMetrics = Array.from(this.metrics.values()).pop();
    if (!latestMetrics) return;

    const alerts = [];

    // 检查CPU使用率
    if (latestMetrics.system?.cpu?.usage) {
      const cpuUsage = latestMetrics.system.cpu.usage;
      if (cpuUsage >= this.thresholds.cpu.critical) {
        alerts.push(this.createAlert('CPU_CRITICAL', `CPU使用率过高: ${cpuUsage}%`, 'critical', { value: cpuUsage }));
      } else if (cpuUsage >= this.thresholds.cpu.warning) {
        alerts.push(this.createAlert('CPU_WARNING', `CPU使用率较高: ${cpuUsage}%`, 'warning', { value: cpuUsage }));
      }
    }

    // 检查内存使用率
    if (latestMetrics.system?.memory?.usage) {
      const memUsage = latestMetrics.system.memory.usage;
      if (memUsage >= this.thresholds.memory.critical) {
        alerts.push(this.createAlert('MEMORY_CRITICAL', `内存使用率过高: ${memUsage.toFixed(1)}%`, 'critical', { value: memUsage }));
      } else if (memUsage >= this.thresholds.memory.warning) {
        alerts.push(this.createAlert('MEMORY_WARNING', `内存使用率较高: ${memUsage.toFixed(1)}%`, 'warning', { value: memUsage }));
      }
    }

    // 检查队列长度
    if (latestMetrics.queues) {
      for (const [queueName, stats] of Object.entries(latestMetrics.queues)) {
        if (stats.waiting >= this.thresholds.queueLength.critical) {
          alerts.push(this.createAlert('QUEUE_CRITICAL', `队列${queueName}积压严重: ${stats.waiting}个任务`, 'critical', { queue: queueName, waiting: stats.waiting }));
        } else if (stats.waiting >= this.thresholds.queueLength.warning) {
          alerts.push(this.createAlert('QUEUE_WARNING', `队列${queueName}积压: ${stats.waiting}个任务`, 'warning', { queue: queueName, waiting: stats.waiting }));
        }
      }
    }

    // 处理告警
    for (const alert of alerts) {
      await this.handleAlert(alert);
    }
  }

  // 创建告警
  createAlert(type, message, severity, data = {}) {
    return {
      id: `${type}_${Date.now()}`,
      type,
      message,
      severity,
      data,
      timestamp: new Date(),
      resolved: false
    };
  }

  // 处理告警
  async handleAlert(alert) {
    const existingAlert = this.alerts.get(alert.type);
    
    // 如果相同类型的告警已存在且未解决，则更新
    if (existingAlert && !existingAlert.resolved) {
      existingAlert.message = alert.message;
      existingAlert.data = alert.data;
      existingAlert.timestamp = alert.timestamp;
      return;
    }

    // 存储新告警
    this.alerts.set(alert.type, alert);

    // 记录日志
    logger.warn(`系统告警: ${alert.message}`, alert);

    // 发送通知
    await this.sendAlertNotification(alert);

    // 存储到缓存
    await cacheManager.lpush('system_alerts', alert);
  }

  // 发送告警通知
  async sendAlertNotification(alert) {
    try {
      // 添加到邮件队列
      await queueManager.addEmailJob('send_email', {
        to: process.env.ALERT_EMAIL || 'admin@example.com',
        subject: `系统告警: ${alert.severity.toUpperCase()}`,
        content: `
          <h2>系统告警通知</h2>
          <p><strong>类型:</strong> ${alert.type}</p>
          <p><strong>级别:</strong> ${alert.severity}</p>
          <p><strong>消息:</strong> ${alert.message}</p>
          <p><strong>时间:</strong> ${alert.timestamp}</p>
          <p><strong>详情:</strong> ${JSON.stringify(alert.data, null, 2)}</p>
        `
      });

      // 发送Slack通知（如果配置了）
      if (process.env.SLACK_WEBHOOK_URL) {
        await queueManager.addAutomationJob('send_notification', {
          type: 'slack',
          recipient: process.env.SLACK_WEBHOOK_URL,
          message: `🚨 系统告警: ${alert.message}`,
          data: alert
        });
      }

      // WebSocket实时通知
      const WebSocketManager = require('./websocketManager');
      if (WebSocketManager && typeof WebSocketManager.notifySystemAlert === 'function') {
        WebSocketManager.notifySystemAlert(alert);
      }

    } catch (error) {
      logger.error('Alert notification error:', error);
    }
  }

  // 解决告警
  async resolveAlert(alertType) {
    const alert = this.alerts.get(alertType);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info(`告警已解决: ${alert.message}`);
      
      // 发送解决通知
      await this.sendResolvedNotification(alert);
    }
  }

  // 发送解决通知
  async sendResolvedNotification(alert) {
    try {
      await queueManager.addEmailJob('send_email', {
        to: process.env.ALERT_EMAIL || 'admin@example.com',
        subject: `告警已解决: ${alert.type}`,
        content: `
          <h2>告警解决通知</h2>
          <p><strong>类型:</strong> ${alert.type}</p>
          <p><strong>原始消息:</strong> ${alert.message}</p>
          <p><strong>触发时间:</strong> ${alert.timestamp}</p>
          <p><strong>解决时间:</strong> ${alert.resolvedAt}</p>
        `
      });
    } catch (error) {
      logger.error('Resolved notification error:', error);
    }
  }

  // 获取当前指标
  getCurrentMetrics() {
    const metrics = Array.from(this.metrics.values());
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  // 获取历史指标
  getHistoricalMetrics(startTime, endTime) {
    const result = [];
    for (const [timestamp, metrics] of this.metrics) {
      if (timestamp >= startTime && timestamp <= endTime) {
        result.push(metrics);
      }
    }
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  // 获取活跃告警
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  // 获取所有告警
  getAllAlerts() {
    return Array.from(this.alerts.values());
  }

  // 设置阈值
  setThreshold(metric, level, value) {
    if (this.thresholds[metric] && this.thresholds[metric][level] !== undefined) {
      this.thresholds[metric][level] = value;
      logger.info(`Threshold updated: ${metric}.${level} = ${value}`);
    }
  }

  // 获取系统健康状态
  getHealthStatus() {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    if (!currentMetrics) {
      return {
        status: 'unknown',
        message: '没有可用的指标数据'
      };
    }

    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    const warningAlerts = activeAlerts.filter(alert => alert.severity === 'warning');

    if (criticalAlerts.length > 0) {
      return {
        status: 'critical',
        message: `${criticalAlerts.length}个严重告警`,
        alerts: criticalAlerts
      };
    }

    if (warningAlerts.length > 0) {
      return {
        status: 'warning',
        message: `${warningAlerts.length}个警告`,
        alerts: warningAlerts
      };
    }

    return {
      status: 'healthy',
      message: '系统运行正常',
      alerts: []
    };
  }

  // 生成监控报告
  async generateReport(timeRange = '1h') {
    const endTime = Date.now();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = endTime - (60 * 60 * 1000);
        break;
      case '6h':
        startTime = endTime - (6 * 60 * 60 * 1000);
        break;
      case '24h':
        startTime = endTime - (24 * 60 * 60 * 1000);
        break;
      default:
        startTime = endTime - (60 * 60 * 1000);
    }

    const metrics = this.getHistoricalMetrics(startTime, endTime);
    const alerts = this.getAllAlerts().filter(alert => 
      alert.timestamp >= new Date(startTime) && alert.timestamp <= new Date(endTime)
    );

    return {
      timeRange,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      metricsCount: metrics.length,
      alertsCount: alerts.length,
      healthStatus: this.getHealthStatus(),
      summary: this.calculateSummary(metrics),
      alerts: alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        resolved: alert.resolved
      }))
    };
  }

  // 计算指标摘要
  calculateSummary(metrics) {
    if (metrics.length === 0) return {};

    const cpuUsages = metrics.map(m => m.system?.cpu?.usage).filter(Boolean);
    const memUsages = metrics.map(m => m.system?.memory?.usage).filter(Boolean);

    return {
      cpu: {
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length,
        max: Math.max(...cpuUsages),
        min: Math.min(...cpuUsages)
      },
      memory: {
        avg: memUsages.reduce((a, b) => a + b, 0) / memUsages.length,
        max: Math.max(...memUsages),
        min: Math.min(...memUsages)
      }
    };
  }
}

// 单例实例
const monitoringSystem = new MonitoringSystem();

module.exports = monitoringSystem;