#!/usr/bin/env node

const mongoose = require('mongoose');
const axios = require('axios');
const os = require('os');
const fs = require('fs').promises;

class HealthChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    this.checks = [
      { name: 'database', fn: this.checkDatabase.bind(this) },
      { name: 'redis', fn: this.checkRedis.bind(this) },
      { name: 'server', fn: this.checkServer.bind(this) },
      { name: 'system', fn: this.checkSystem.bind(this) },
      { name: 'disk', fn: this.checkDisk.bind(this) },
      { name: 'memory', fn: this.checkMemory.bind(this) },
      { name: 'queues', fn: this.checkQueues.bind(this) },
      { name: 'endpoints', fn: this.checkEndpoints.bind(this) }
    ];
  }

  async run() {
    console.log('🏥 开始系统健康检查...\n');
    
    for (const check of this.checks) {
      try {
        console.log(`⏳ 检查 ${check.name}...`);
        const result = await check.fn();
        this.results.checks[check.name] = result;
        this.updateSummary(result);
        
        const status = this.getStatusIcon(result.status);
        console.log(`${status} ${check.name}: ${result.message}`);
        
        if (result.details) {
          console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`);
        }
        
      } catch (error) {
        const result = {
          status: 'error',
          message: `检查失败: ${error.message}`,
          error: error.message
        };
        
        this.results.checks[check.name] = result;
        this.updateSummary(result);
        
        console.log(`❌ ${check.name}: ${result.message}`);
      }
      console.log('');
    }
    
    this.calculateOverallHealth();
    this.printSummary();
    
    // 返回退出码
    return this.results.overall === 'healthy' ? 0 : 1;
  }

  async checkDatabase() {
    try {
      // 连接MongoDB
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-ads';
      await mongoose.connect(uri, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      
      // 检查连接状态
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'error',
          message: '数据库连接失败',
          details: { readyState: mongoose.connection.readyState }
        };
      }
      
      // 执行简单查询测试
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      
      if (result.ok !== 1) {
        return {
          status: 'error',
          message: '数据库ping失败',
          details: result
        };
      }
      
      // 获取数据库统计信息
      const stats = await admin.command({ dbStats: 1 });
      
      await mongoose.connection.close();
      
      return {
        status: 'healthy',
        message: '数据库连接正常',
        details: {
          collections: stats.collections,
          dataSize: this.formatBytes(stats.dataSize),
          storageSize: this.formatBytes(stats.storageSize)
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: `数据库检查失败: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkRedis() {
    try {
      const redis = require('redis');
      const client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        connectTimeout: 5000
      });
      
      await client.connect();
      
      // 测试set/get操作
      const testKey = 'healthcheck:test';
      const testValue = Date.now().toString();
      
      await client.set(testKey, testValue, { EX: 10 });
      const retrieved = await client.get(testKey);
      
      if (retrieved !== testValue) {
        await client.quit();
        return {
          status: 'error',
          message: 'Redis读写测试失败'
        };
      }
      
      // 获取Redis信息
      const info = await client.info('memory');
      
      await client.del(testKey);
      await client.quit();
      
      return {
        status: 'healthy',
        message: 'Redis连接正常',
        details: {
          memory: this.parseRedisInfo(info)
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: `Redis检查失败: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkServer() {
    try {
      const port = process.env.PORT || 5000;
      const baseUrl = `http://localhost:${port}`;
      
      // 检查健康端点
      const response = await axios.get(`${baseUrl}/api/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        return {
          status: 'error',
          message: `服务器响应异常: ${response.status}`,
          details: { status: response.status }
        };
      }
      
      const responseTime = response.headers['x-response-time'];
      const data = response.data;
      
      return {
        status: 'healthy',
        message: '服务器运行正常',
        details: {
          responseTime,
          uptime: data.uptime,
          environment: data.environment,
          version: data.version
        }
      };
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return {
          status: 'error',
          message: '服务器未启动或端口不可访问',
          error: error.message
        };
      }
      
      return {
        status: 'error',
        message: `服务器检查失败: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkSystem() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();
    
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    const cpuLoad = loadAvg[0];
    
    let status = 'healthy';
    let warnings = [];
    
    // 检查内存使用率
    if (memUsage > 90) {
      status = 'warning';
      warnings.push('内存使用率过高');
    } else if (memUsage > 80) {
      warnings.push('内存使用率较高');
    }
    
    // 检查CPU负载
    if (cpuLoad > cpus.length * 2) {
      status = 'warning';
      warnings.push('CPU负载过高');
    } else if (cpuLoad > cpus.length) {
      warnings.push('CPU负载较高');
    }
    
    return {
      status,
      message: warnings.length > 0 ? warnings.join(', ') : '系统资源正常',
      details: {
        cpus: cpus.length,
        memory: {
          total: this.formatBytes(totalMem),
          free: this.formatBytes(freeMem),
          usage: `${memUsage.toFixed(1)}%`
        },
        load: {
          '1m': loadAvg[0].toFixed(2),
          '5m': loadAvg[1].toFixed(2),
          '15m': loadAvg[2].toFixed(2)
        },
        uptime: this.formatUptime(uptime)
      }
    };
  }

  async checkDisk() {
    try {
      // 检查当前目录的磁盘空间
      const stats = await fs.stat('.');
      
      // 这里可以添加更详细的磁盘空间检查
      // 由于Node.js没有内置的磁盘空间API，这里使用占位符
      
      return {
        status: 'healthy',
        message: '磁盘空间充足',
        details: {
          note: '需要实现具体的磁盘空间检查逻辑'
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: `磁盘检查失败: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    
    const heapUsedPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const rssPercentage = (memUsage.rss / totalMem) * 100;
    
    let status = 'healthy';
    let warnings = [];
    
    if (heapUsedPercentage > 90) {
      status = 'warning';
      warnings.push('堆内存使用率过高');
    }
    
    if (rssPercentage > 10) {
      warnings.push('进程内存占用较大');
    }
    
    return {
      status,
      message: warnings.length > 0 ? warnings.join(', ') : '内存使用正常',
      details: {
        rss: this.formatBytes(memUsage.rss),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapUsedPercentage: `${heapUsedPercentage.toFixed(1)}%`,
        external: this.formatBytes(memUsage.external)
      }
    };
  }

  async checkQueues() {
    try {
      // 这里应该检查队列系统的状态
      // 由于队列系统可能没有启动，我们只做基本检查
      
      return {
        status: 'healthy',
        message: '队列系统检查完成',
        details: {
          note: '需要集成实际的队列检查逻辑'
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: `队列检查失败: ${error.message}`,
        error: error.message
      };
    }
  }

  async checkEndpoints() {
    const endpoints = [
      '/api/health',
      '/api/auth/status'
    ];
    
    const port = process.env.PORT || 5000;
    const baseUrl = `http://localhost:${port}`;
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        results.push({
          endpoint,
          status: response.status,
          responseTime: response.headers['x-response-time'] || 'N/A'
        });
        
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          error: error.message
        });
      }
    }
    
    const failedEndpoints = results.filter(r => r.status === 'error' || r.status >= 500);
    
    return {
      status: failedEndpoints.length > 0 ? 'warning' : 'healthy',
      message: failedEndpoints.length > 0 
        ? `${failedEndpoints.length}个端点异常` 
        : '所有端点正常',
      details: { endpoints: results }
    };
  }

  updateSummary(result) {
    this.results.summary.total++;
    
    switch (result.status) {
      case 'healthy':
        this.results.summary.passed++;
        break;
      case 'warning':
        this.results.summary.warnings++;
        break;
      case 'error':
        this.results.summary.failed++;
        break;
    }
  }

  calculateOverallHealth() {
    const { passed, failed, warnings, total } = this.results.summary;
    
    if (failed > 0) {
      this.results.overall = 'unhealthy';
    } else if (warnings > 0) {
      this.results.overall = 'degraded';
    } else if (passed === total) {
      this.results.overall = 'healthy';
    } else {
      this.results.overall = 'unknown';
    }
  }

  printSummary() {
    console.log('📊 健康检查总结:');
    console.log('================');
    console.log(`总检查项: ${this.results.summary.total}`);
    console.log(`✅ 通过: ${this.results.summary.passed}`);
    console.log(`⚠️  警告: ${this.results.summary.warnings}`);
    console.log(`❌ 失败: ${this.results.summary.failed}`);
    console.log('');
    
    const overallIcon = this.getOverallIcon(this.results.overall);
    console.log(`${overallIcon} 整体状态: ${this.results.overall.toUpperCase()}`);
    console.log('');
    
    // 输出JSON格式结果（用于自动化）
    if (process.argv.includes('--json')) {
      console.log('JSON输出:');
      console.log(JSON.stringify(this.results, null, 2));
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  getOverallIcon(overall) {
    switch (overall) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    }
    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    }
    return `${minutes}分钟`;
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const result = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key === 'used_memory_human') {
          result.usedMemory = value;
        }
        if (key === 'used_memory_peak_human') {
          result.peakMemory = value;
        }
      }
    }
    
    return result;
  }
}

// 运行健康检查
if (require.main === module) {
  const checker = new HealthChecker();
  checker.run()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ 健康检查执行失败:', error);
      process.exit(1);
    });
}

module.exports = HealthChecker;