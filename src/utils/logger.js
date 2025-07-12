const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 定义控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'facebook-ads-system' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    
    // 访问日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 7,
      tailable: true
    })
  ]
});

// 在开发环境下添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 扩展logger功能
logger.logUserAction = function(userId, action, details = {}) {
  this.info('User Action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
    type: 'user_action'
  });
};

logger.logCloakEvent = function(ip, userAgent, result, details = {}) {
  this.info('Cloak Event', {
    ip,
    userAgent,
    result,
    details,
    timestamp: new Date().toISOString(),
    type: 'cloak_event'
  });
};

logger.logSystemEvent = function(event, details = {}) {
  this.info('System Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
    type: 'system_event'
  });
};

logger.logSecurityEvent = function(type, ip, details = {}) {
  this.warn('Security Event', {
    type,
    ip,
    details,
    timestamp: new Date().toISOString(),
    type: 'security_event'
  });
};

logger.logApiRequest = function(method, url, ip, userId, responseTime) {
  this.info('API Request', {
    method,
    url,
    ip,
    userId,
    responseTime,
    timestamp: new Date().toISOString(),
    type: 'api_request'
  });
};

// 异常处理
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 5
  })
);

// 未捕获的Promise rejection处理
process.on('unhandledRejection', (ex) => {
  throw ex;
});

module.exports = logger;