const CacheManager = require('../../src/utils/cacheManager');

// 模拟Redis客户端
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    lPush: jest.fn(),
    rPop: jest.fn(),
    lLen: jest.fn(),
    publish: jest.fn(),
    info: jest.fn(),
    dbSize: jest.fn(),
    quit: jest.fn()
  }))
}));

describe('CacheManager', () => {
  let cacheManager;
  let mockRedisClient;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 获取模拟的Redis客户端
    const redis = require('redis');
    mockRedisClient = redis.createClient();
    
    // 模拟连接状态
    cacheManager = new CacheManager();
    cacheManager.client = mockRedisClient;
    cacheManager.isConnected = true;
  });

  describe('generateKey', () => {
    test('应该生成正确的缓存键格式', () => {
      const key = cacheManager.generateKey('cache', 'test-key');
      expect(key).toBe('fb_ads:cache:test-key');
    });

    test('应该包含租户信息', () => {
      const key = cacheManager.generateKey('cache', 'test-key', 'tenant-123');
      expect(key).toBe('fb_ads:tenant:tenant-123:cache:test-key');
    });
  });

  describe('set', () => {
    test('应该成功设置缓存', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const result = await cacheManager.set('test-key', { foo: 'bar' }, 3600);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'fb_ads:cache:test-key',
        3600,
        JSON.stringify({
          data: { foo: 'bar' },
          timestamp: expect.any(Number),
          ttl: 3600
        })
      );
    });

    test('连接失败时应该返回false', async () => {
      cacheManager.isConnected = false;
      
      const result = await cacheManager.set('test-key', { foo: 'bar' });
      
      expect(result).toBe(false);
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    test('Redis错误时应该返回false', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));
      
      const result = await cacheManager.set('test-key', { foo: 'bar' });
      
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    test('应该成功获取缓存数据', async () => {
      const cachedData = JSON.stringify({
        data: { foo: 'bar' },
        timestamp: Date.now(),
        ttl: 3600
      });
      
      mockRedisClient.get.mockResolvedValue(cachedData);
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toEqual({ foo: 'bar' });
      expect(mockRedisClient.get).toHaveBeenCalledWith('fb_ads:cache:test-key');
    });

    test('缓存不存在时应该返回null', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBeNull();
    });

    test('连接失败时应该返回null', async () => {
      cacheManager.isConnected = false;
      
      const result = await cacheManager.get('test-key');
      
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('del', () => {
    test('应该成功删除缓存', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await cacheManager.del('test-key');
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('fb_ads:cache:test-key');
    });

    test('删除不存在的键应该返回false', async () => {
      mockRedisClient.del.mockResolvedValue(0);
      
      const result = await cacheManager.del('test-key');
      
      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    test('缓存命中时应该返回缓存数据', async () => {
      const cachedData = JSON.stringify({
        data: { foo: 'bar' },
        timestamp: Date.now(),
        ttl: 3600
      });
      
      mockRedisClient.get.mockResolvedValue(cachedData);
      
      const fetchFunction = jest.fn();
      const result = await cacheManager.getOrSet('test-key', fetchFunction);
      
      expect(result).toEqual({ foo: 'bar' });
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    test('缓存未命中时应该执行获取函数', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const fetchFunction = jest.fn().mockResolvedValue({ foo: 'baz' });
      const result = await cacheManager.getOrSet('test-key', fetchFunction);
      
      expect(result).toEqual({ foo: 'baz' });
      expect(fetchFunction).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    test('获取函数出错时应该返回null', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const fetchFunction = jest.fn().mockRejectedValue(new Error('Fetch error'));
      const result = await cacheManager.getOrSet('test-key', fetchFunction);
      
      expect(result).toBeNull();
    });
  });

  describe('incr', () => {
    test('应该成功递增计数器', async () => {
      mockRedisClient.incr.mockResolvedValue(5);
      
      const result = await cacheManager.incr('counter-key');
      
      expect(result).toBe(5);
      expect(mockRedisClient.incr).toHaveBeenCalledWith('fb_ads:counter:counter-key');
    });
  });

  describe('会话管理', () => {
    test('应该成功设置会话', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      const sessionData = { userId: '123', role: 'user' };
      const result = await cacheManager.setSession('session-123', sessionData);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'fb_ads:session:session-123',
        86400,
        JSON.stringify(sessionData)
      );
    });

    test('应该成功获取会话', async () => {
      const sessionData = { userId: '123', role: 'user' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
      
      const result = await cacheManager.getSession('session-123');
      
      expect(result).toEqual(sessionData);
    });

    test('应该成功删除会话', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await cacheManager.delSession('session-123');
      
      expect(result).toBe(true);
    });
  });

  describe('列表操作', () => {
    test('应该成功推入列表', async () => {
      mockRedisClient.lPush.mockResolvedValue(1);
      
      const result = await cacheManager.lpush('list-key', { item: 'data' });
      
      expect(result).toBe(1);
      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'fb_ads:list:list-key',
        JSON.stringify({ item: 'data' })
      );
    });

    test('应该成功弹出列表元素', async () => {
      const itemData = { item: 'data' };
      mockRedisClient.rPop.mockResolvedValue(JSON.stringify(itemData));
      
      const result = await cacheManager.rpop('list-key');
      
      expect(result).toEqual(itemData);
    });

    test('应该获取列表长度', async () => {
      mockRedisClient.lLen.mockResolvedValue(5);
      
      const result = await cacheManager.llen('list-key');
      
      expect(result).toBe(5);
    });
  });

  describe('发布/订阅', () => {
    test('应该成功发布消息', async () => {
      mockRedisClient.publish.mockResolvedValue(1);
      
      const message = { type: 'test', data: 'hello' };
      const result = await cacheManager.publish('test-channel', message);
      
      expect(result).toBe(true);
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'test-channel',
        JSON.stringify(message)
      );
    });
  });

  describe('统计信息', () => {
    test('应该获取缓存统计', async () => {
      mockRedisClient.info.mockResolvedValue('memory info');
      mockRedisClient.dbSize.mockResolvedValue(100);
      
      const stats = await cacheManager.getStats();
      
      expect(stats).toEqual({
        connected: true,
        memory: 'memory info',
        keyspace: 'memory info',
        totalKeys: 100
      });
    });
  });

  describe('清理功能', () => {
    test('应该清理过期键', async () => {
      const keys = ['fb_ads:cache:key1', 'fb_ads:cache:key2'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.ttl.mockResolvedValue(-1);
      mockRedisClient.expire.mockResolvedValue(1);
      
      const result = await cacheManager.cleanup();
      
      expect(result).toBe(2);
      expect(mockRedisClient.expire).toHaveBeenCalledTimes(2);
    });
  });
});