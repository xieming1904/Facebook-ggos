const redis = require('redis');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1小时
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    this.connect();
  }

  // 连接Redis
  async connect() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      };

      this.client = redis.createClient(redisConfig);
      
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });
      
      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });
      
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });
      
      this.client.on('end', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });
      
      await this.client.connect();
      
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  // 检查连接状态
  async ensureConnection() {
    if (!this.isConnected && this.client) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Failed to reconnect to Redis:', error);
        return false;
      }
    }
    return this.isConnected;
  }

  // 生成缓存键
  generateKey(type, identifier, tenant = null) {
    const parts = ['fb_ads'];
    if (tenant) parts.push(`tenant:${tenant}`);
    parts.push(type);
    if (identifier) parts.push(identifier);
    return parts.join(':');
  }

  // 设置缓存
  async set(key, value, ttl = this.defaultTTL, tenant = null) {
    if (!await this.ensureConnection()) {
      logger.warn('Redis not available, skipping cache set');
      return false;
    }

    try {
      const cacheKey = this.generateKey('cache', key, tenant);
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl: ttl
      });
      
      await this.client.setEx(cacheKey, ttl, serializedValue);
      logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
      return true;
      
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // 获取缓存
  async get(key, tenant = null) {
    if (!await this.ensureConnection()) {
      logger.warn('Redis not available, skipping cache get');
      return null;
    }

    try {
      const cacheKey = this.generateKey('cache', key, tenant);
      const cachedData = await this.client.get(cacheKey);
      
      if (!cachedData) {
        logger.debug(`Cache miss: ${cacheKey}`);
        return null;
      }
      
      const parsed = JSON.parse(cachedData);
      logger.debug(`Cache hit: ${cacheKey}`);
      return parsed.data;
      
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // 删除缓存
  async del(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey('cache', key, tenant);
      const result = await this.client.del(cacheKey);
      logger.debug(`Cache deleted: ${cacheKey}`);
      return result > 0;
      
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // 批量删除（按模式）
  async delPattern(pattern, tenant = null) {
    if (!await this.ensureConnection()) {
      return 0;
    }

    try {
      const searchPattern = this.generateKey('cache', pattern, tenant);
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(keys);
      logger.debug(`Cache pattern deleted: ${searchPattern} (${result} keys)`);
      return result;
      
    } catch (error) {
      logger.error('Cache pattern delete error:', error);
      return 0;
    }
  }

  // 检查缓存是否存在
  async exists(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey('cache', key, tenant);
      const result = await this.client.exists(cacheKey);
      return result === 1;
      
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // 设置TTL
  async expire(key, ttl, tenant = null) {
    if (!await this.ensureConnection()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey('cache', key, tenant);
      const result = await this.client.expire(cacheKey, ttl);
      return result === 1;
      
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  // 获取TTL
  async ttl(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return -1;
    }

    try {
      const cacheKey = this.generateKey('cache', key, tenant);
      return await this.client.ttl(cacheKey);
      
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  // 缓存装饰器
  cache(keyGenerator, ttl = this.defaultTTL) {
    return (target, propertyName, descriptor) => {
      const method = descriptor.value;
      
      descriptor.value = async function(...args) {
        const cacheKey = typeof keyGenerator === 'function' 
          ? keyGenerator(...args) 
          : keyGenerator;
        
        const tenant = this.tenant || args.find(arg => arg && arg.tenant)?.tenant;
        
        // 尝试从缓存获取
        const cached = await cacheManager.get(cacheKey, tenant);
        if (cached !== null) {
          return cached;
        }
        
        // 执行原方法
        const result = await method.apply(this, args);
        
        // 存入缓存
        if (result !== null && result !== undefined) {
          await cacheManager.set(cacheKey, result, ttl, tenant);
        }
        
        return result;
      };
      
      return descriptor;
    };
  }

  // 缓存助手函数
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL, tenant = null) {
    // 尝试从缓存获取
    const cached = await this.get(key, tenant);
    if (cached !== null) {
      return cached;
    }
    
    // 执行获取函数
    try {
      const result = await fetchFunction();
      
      // 存入缓存
      if (result !== null && result !== undefined) {
        await this.set(key, result, ttl, tenant);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      return null;
    }
  }

  // 会话存储
  async setSession(sessionId, data, ttl = 86400) { // 24小时
    const key = this.generateKey('session', sessionId);
    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Session set error:', error);
      return false;
    }
  }

  async getSession(sessionId) {
    const key = this.generateKey('session', sessionId);
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Session get error:', error);
      return null;
    }
  }

  async delSession(sessionId) {
    const key = this.generateKey('session', sessionId);
    try {
      return await this.client.del(key) > 0;
    } catch (error) {
      logger.error('Session delete error:', error);
      return false;
    }
  }

  // 计数器
  async incr(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return 0;
    }

    try {
      const cacheKey = this.generateKey('counter', key, tenant);
      return await this.client.incr(cacheKey);
    } catch (error) {
      logger.error('Cache incr error:', error);
      return 0;
    }
  }

  async decr(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return 0;
    }

    try {
      const cacheKey = this.generateKey('counter', key, tenant);
      return await this.client.decr(cacheKey);
    } catch (error) {
      logger.error('Cache decr error:', error);
      return 0;
    }
  }

  // 列表操作
  async lpush(key, value, tenant = null) {
    if (!await this.ensureConnection()) {
      return 0;
    }

    try {
      const cacheKey = this.generateKey('list', key, tenant);
      return await this.client.lPush(cacheKey, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache lpush error:', error);
      return 0;
    }
  }

  async rpop(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return null;
    }

    try {
      const cacheKey = this.generateKey('list', key, tenant);
      const result = await this.client.rPop(cacheKey);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Cache rpop error:', error);
      return null;
    }
  }

  async llen(key, tenant = null) {
    if (!await this.ensureConnection()) {
      return 0;
    }

    try {
      const cacheKey = this.generateKey('list', key, tenant);
      return await this.client.lLen(cacheKey);
    } catch (error) {
      logger.error('Cache llen error:', error);
      return 0;
    }
  }

  // 发布/订阅
  async publish(channel, message) {
    if (!await this.ensureConnection()) {
      return false;
    }

    try {
      await this.client.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('Cache publish error:', error);
      return false;
    }
  }

  // 获取缓存统计
  async getStats() {
    if (!await this.ensureConnection()) {
      return null;
    }

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
        totalKeys: await this.client.dbSize()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }

  // 清理过期键
  async cleanup() {
    if (!await this.ensureConnection()) {
      return 0;
    }

    try {
      const pattern = this.generateKey('cache', '*');
      const keys = await this.client.keys(pattern);
      let cleanedCount = 0;
      
      for (const key of keys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -1) { // 没有TTL的键
          await this.client.expire(key, this.defaultTTL);
          cleanedCount++;
        }
      }
      
      logger.info(`Cache cleanup completed: ${cleanedCount} keys processed`);
      return cleanedCount;
    } catch (error) {
      logger.error('Cache cleanup error:', error);
      return 0;
    }
  }

  // 关闭连接
  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

// 单例实例
const cacheManager = new CacheManager();

module.exports = cacheManager;