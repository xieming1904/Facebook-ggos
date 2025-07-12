const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// 健康检查端点
router.get('/', async (req, res) => {
  try {
    // 检查数据库连接
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // 检查内存使用情况
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    };
    
    // 检查系统运行时间
    const uptime = process.uptime();
    
    // 系统信息
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      timestamp: new Date().toISOString()
    };
    
    // 响应健康状态
    res.status(200).json({
      status: 'healthy',
      database: dbStatus,
      memory: memoryUsageMB,
      system: systemInfo,
      services: {
        api: 'running',
        database: dbStatus === 'connected' ? 'running' : 'error'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;