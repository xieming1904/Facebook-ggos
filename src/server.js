const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const loggerMiddleware = require('./middleware/loggerMiddleware');

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
app.use(loggerMiddleware);

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
.then(() => {
  console.log('MongoDB connected');
  logger.logSystemEvent('database_connected', { uri: process.env.MONGODB_URI ? 'configured' : 'default' });
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

// Cloak中间件 - 检测Facebook爬虫
app.use('/page/:id', require('./middleware/cloakMiddleware'));

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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logger.logSystemEvent('server_started', { port: PORT, environment: process.env.NODE_ENV || 'development' });
});