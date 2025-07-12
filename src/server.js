const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
require('dotenv').config();

const logger = require('./utils/logger');
const loggerMiddleware = require('./middleware/loggerMiddleware');

// 引入新的功能模块
const WebSocketManager = require('./utils/websocketManager');
const cacheManager = require('./utils/cacheManager');
const queueManager = require('./utils/queueManager');
const { tenantMiddleware } = require('./middleware/tenantMiddleware');

const app = express();
const server = http.createServer(app);

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
app.use(loggerMiddleware);

// 多租户中间件
app.use('/api', tenantMiddleware);

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟最多100个请求
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../client/build')));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-ads', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  logger.logSystemEvent('database_connected', { uri: process.env.MONGODB_URI ? 'configured' : 'default' });
  
  // 启动自动化引擎
  try {
    const automationEngine = require('./utils/automationEngine');
    await automationEngine.start();
    console.log('Automation engine started');
  } catch (error) {
    console.error('Failed to start automation engine:', error);
    logger.error('Automation engine start failed', { error: error.message });
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  logger.error('Database connection failed', { error: err.message });
});

// 路由
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/domains', require('./routes/domains'));
app.use('/api/landing-pages', require('./routes/landingPages'));
app.use('/api/cloak', require('./routes/cloak'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/system', require('./routes/system'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/ab-tests', require('./routes/abTests'));
app.use('/api/automation-rules', require('./routes/automationRules'));

// Cloak中间件 - 检测Facebook爬虫
app.use('/page/:id', require('./middleware/cloakMiddleware'));

// A/B测试中间件
const { abTestMiddleware, abTestStatsMiddleware } = require('./middleware/abTestMiddleware');
app.use('/page/:id', abTestMiddleware, abTestStatsMiddleware);

// 落地页路由
app.get('/page/:id', require('./routes/pageViewer'));

// 前端路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.originalUrl,
    method: req.method 
  });
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// 初始化WebSocket管理器
let wsManager;
try {
  wsManager = new WebSocketManager(server);
  console.log('WebSocket manager initialized');
  logger.logSystemEvent('websocket_initialized');
} catch (error) {
  console.error('Failed to initialize WebSocket manager:', error);
  logger.error('WebSocket initialization failed', { error: error.message });
}

// 启动服务器
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  logger.logSystemEvent('server_started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
  
  // 等待队列系统初始化
  try {
    await new Promise(resolve => {
      const checkQueue = () => {
        if (queueManager.isInitialized) {
          resolve();
        } else {
          setTimeout(checkQueue, 100);
        }
      };
      checkQueue();
    });
    
    console.log('All systems initialized successfully');
    logger.logSystemEvent('all_systems_ready');
    
    // 定期清理缓存
    setInterval(async () => {
      try {
        await cacheManager.cleanup();
      } catch (error) {
        logger.error('Cache cleanup failed', { error: error.message });
      }
    }, 3600000); // 每小时清理一次
    
  } catch (error) {
    console.error('System initialization error:', error);
    logger.error('System initialization failed', { error: error.message });
  }
});

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  try {
    await queueManager.close();
    await cacheManager.close();
    if (wsManager) {
      wsManager.close();
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  try {
    await queueManager.close();
    await cacheManager.close();
    if (wsManager) {
      wsManager.close();
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});