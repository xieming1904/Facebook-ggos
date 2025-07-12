const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// MongoDB内存服务器
let mongoServer;

// 全局测试设置
beforeAll(async () => {
  // 启动内存MongoDB服务器
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // 连接到测试数据库
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  console.log('Connected to in-memory MongoDB for testing');
});

// 每个测试前清理数据库
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// 全局测试清理
afterAll(async () => {
  // 关闭数据库连接
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // 停止内存MongoDB服务器
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('Disconnected from in-memory MongoDB');
});

// 全局测试超时
jest.setTimeout(30000);

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 测试工具函数
global.testUtils = {
  // 创建测试用户
  async createTestUser(userData = {}) {
    const User = require('../src/models/User');
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    };
    
    const user = new User({ ...defaultUser, ...userData });
    await user.save();
    return user;
  },
  
  // 创建测试组织
  async createTestOrganization(orgData = {}) {
    const Organization = require('../src/models/Organization');
    const user = await this.createTestUser();
    
    const defaultOrg = {
      name: 'Test Organization',
      slug: 'test-org',
      createdBy: user._id,
      ownerId: user._id
    };
    
    const org = new Organization({ ...defaultOrg, ...orgData });
    await org.save();
    return { organization: org, user };
  },
  
  // 创建JWT Token
  createTestToken(userId, role = 'user') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },
  
  // 模拟Express请求对象
  mockRequest(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      tenant: null,
      ...overrides
    };
  },
  
  // 模拟Express响应对象
  mockResponse() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // 清理测试数据
  async cleanupDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

// 环境变量设置
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/facebook-ads-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// 禁用日志输出（测试时）
if (process.env.NODE_ENV === 'test') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}