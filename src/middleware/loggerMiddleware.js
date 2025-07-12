const logger = require('../utils/logger');

const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('User-Agent') || '';
  const userId = req.user ? req.user.userId : null;
  
  // 监听响应结束事件
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const { statusCode } = res;
    
    // 记录API请求日志
    logger.logApiRequest(method, originalUrl, ip, userId, responseTime);
    
    // 如果是错误响应，额外记录错误日志
    if (statusCode >= 400) {
      logger.warn('API Error Response', {
        method,
        url: originalUrl,
        statusCode,
        ip,
        userAgent,
        userId,
        responseTime,
        type: 'api_error'
      });
    }
    
    // 记录安全相关的请求
    if (originalUrl.includes('/auth/') || originalUrl.includes('/settings/') || originalUrl.includes('/system/')) {
      logger.logSecurityEvent('sensitive_api_access', ip, {
        method,
        url: originalUrl,
        statusCode,
        userId,
        userAgent
      });
    }
  });
  
  next();
};

module.exports = loggerMiddleware;