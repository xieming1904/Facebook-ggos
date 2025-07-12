module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 根目录
  rootDir: '.',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '<rootDir>/src/**/__tests__/**/*.js',
    '<rootDir>/src/**/*.test.js',
    '<rootDir>/src/**/*.spec.js'
  ],

  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/client/',
    '/dist/',
    '/coverage/'
  ],

  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**'
  ],

  // 覆盖率报告
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],

  // 覆盖率目录
  coverageDirectory: 'coverage',

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 测试设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 模块映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 清除模拟
  clearMocks: true,

  // 详细输出
  verbose: true,

  // 测试超时
  testTimeout: 10000,

  // 并发测试
  maxWorkers: '50%',

  // 全局变量
  globals: {
    'NODE_ENV': 'test'
  },

  // 转换配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Babel配置
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],

  // 模拟
  moduleFileExtensions: ['js', 'json'],

  // 测试结果处理器
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Facebook广告落地页管理系统 - 测试报告',
      outputPath: 'coverage/test-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ]
};