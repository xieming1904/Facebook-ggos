const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const User = require('../models/User');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.rooms = new Map(); // roomId -> Set of userIds
    this.connectionStats = {
      total: 0,
      authenticated: 0,
      rooms: 0
    };
    
    this.setupWebSocketServer();
    this.setupHeartbeat();
    
    logger.info('WebSocket server initialized');
  }

  // 验证客户端连接
  async verifyClient(info) {
    try {
      const token = new URL(`http://localhost${info.req.url}`).searchParams.get('token');
      if (!token) return false;
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) return false;
      
      info.req.user = user;
      return true;
    } catch (error) {
      logger.error('WebSocket verification failed:', error);
      return false;
    }
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const user = req.user;
      const userId = user._id.toString();
      
      // 初始化连接
      ws.userId = userId;
      ws.user = user;
      ws.isAlive = true;
      ws.joinedRooms = new Set();
      
      // 添加到客户端映射
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);
      
      // 更新统计
      this.connectionStats.total++;
      this.connectionStats.authenticated++;
      
      logger.info(`WebSocket client connected: ${user.username} (${userId})`);
      
      // 发送欢迎消息
      this.sendToClient(ws, {
        type: 'connection',
        message: 'Connected successfully',
        data: {
          userId,
          username: user.username,
          role: user.role,
          serverTime: new Date().toISOString()
        }
      });
      
      // 设置消息处理
      ws.on('message', (data) => this.handleMessage(ws, data));
      
      // 设置心跳响应
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // 处理连接关闭
      ws.on('close', () => this.handleDisconnection(ws));
      
      // 处理错误
      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}:`, error);
      });
    });
  }

  // 处理消息
  handleMessage(ws, rawData) {
    try {
      const message = JSON.parse(rawData);
      const { type, data } = message;
      
      logger.debug(`WebSocket message from ${ws.userId}:`, { type, data });
      
      switch (type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;
          
        case 'join_room':
          this.joinRoom(ws, data.roomId);
          break;
          
        case 'leave_room':
          this.leaveRoom(ws, data.roomId);
          break;
          
        case 'subscribe_analytics':
          this.subscribeToAnalytics(ws, data);
          break;
          
        case 'subscribe_ab_test':
          this.subscribeToABTest(ws, data.testId);
          break;
          
        case 'subscribe_automation':
          this.subscribeToAutomation(ws, data.ruleId);
          break;
          
        case 'get_online_users':
          this.sendOnlineUsers(ws);
          break;
          
        default:
          logger.warn(`Unknown WebSocket message type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error handling WebSocket message from ${ws.userId}:`, error);
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  // 处理断开连接
  handleDisconnection(ws) {
    const userId = ws.userId;
    
    // 从所有房间中移除
    ws.joinedRooms.forEach(roomId => {
      this.leaveRoom(ws, roomId, false);
    });
    
    // 从客户端映射中移除
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }
    
    // 更新统计
    this.connectionStats.total--;
    this.connectionStats.authenticated--;
    
    logger.info(`WebSocket client disconnected: ${userId}`);
  }

  // 加入房间
  joinRoom(ws, roomId) {
    if (!roomId) return;
    
    const userId = ws.userId;
    
    // 添加到房间
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.connectionStats.rooms++;
    }
    this.rooms.get(roomId).add(userId);
    ws.joinedRooms.add(roomId);
    
    logger.debug(`User ${userId} joined room ${roomId}`);
    
    // 通知房间内其他用户
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      data: {
        userId,
        username: ws.user.username,
        roomId
      }
    }, userId);
    
    // 发送确认
    this.sendToClient(ws, {
      type: 'room_joined',
      data: { roomId }
    });
  }

  // 离开房间
  leaveRoom(ws, roomId, sendConfirmation = true) {
    if (!roomId || !this.rooms.has(roomId)) return;
    
    const userId = ws.userId;
    
    this.rooms.get(roomId).delete(userId);
    ws.joinedRooms.delete(roomId);
    
    // 如果房间为空，删除房间
    if (this.rooms.get(roomId).size === 0) {
      this.rooms.delete(roomId);
      this.connectionStats.rooms--;
    }
    
    logger.debug(`User ${userId} left room ${roomId}`);
    
    // 通知房间内其他用户
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      data: {
        userId,
        username: ws.user.username,
        roomId
      }
    });
    
    // 发送确认
    if (sendConfirmation) {
      this.sendToClient(ws, {
        type: 'room_left',
        data: { roomId }
      });
    }
  }

  // 订阅分析数据
  subscribeToAnalytics(ws, config) {
    const roomId = `analytics_${config.pageId || 'global'}`;
    this.joinRoom(ws, roomId);
    
    // 发送初始数据
    this.sendAnalyticsUpdate(ws, config);
  }

  // 订阅A/B测试数据
  subscribeToABTest(ws, testId) {
    const roomId = `ab_test_${testId}`;
    this.joinRoom(ws, roomId);
    
    // 发送初始数据
    this.sendABTestUpdate(ws, testId);
  }

  // 订阅自动化规则
  subscribeToAutomation(ws, ruleId) {
    const roomId = `automation_${ruleId}`;
    this.joinRoom(ws, roomId);
  }

  // 发送在线用户列表
  sendOnlineUsers(ws) {
    const onlineUsers = Array.from(this.clients.keys()).map(userId => {
      const userClients = this.clients.get(userId);
      const firstClient = userClients.values().next().value;
      return {
        userId,
        username: firstClient.user.username,
        role: firstClient.user.role,
        connectionCount: userClients.size
      };
    });
    
    this.sendToClient(ws, {
      type: 'online_users',
      data: onlineUsers
    });
  }

  // 发送消息给特定客户端
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    }
  }

  // 发送消息给特定用户的所有连接
  sendToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach(ws => {
        this.sendToClient(ws, message);
      });
    }
  }

  // 广播消息到房间
  broadcastToRoom(roomId, message, excludeUserId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.forEach(userId => {
      if (userId !== excludeUserId) {
        this.sendToUser(userId, message);
      }
    });
  }

  // 广播给所有连接的用户
  broadcast(message, excludeUserId = null) {
    this.clients.forEach((userClients, userId) => {
      if (userId !== excludeUserId) {
        userClients.forEach(ws => {
          this.sendToClient(ws, message);
        });
      }
    });
  }

  // 心跳检测
  setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30秒心跳
  }

  // 发送分析数据更新
  async sendAnalyticsUpdate(ws, config) {
    try {
      // 这里应该从数据库获取实际数据
      const analyticsData = {
        visitors: Math.floor(Math.random() * 1000),
        conversions: Math.floor(Math.random() * 100),
        revenue: Math.floor(Math.random() * 10000),
        timestamp: Date.now()
      };
      
      this.sendToClient(ws, {
        type: 'analytics_update',
        data: analyticsData
      });
    } catch (error) {
      logger.error('Error sending analytics update:', error);
    }
  }

  // 发送A/B测试更新
  async sendABTestUpdate(ws, testId) {
    try {
      // 这里应该从数据库获取实际数据
      const testData = {
        testId,
        status: 'running',
        totalVisitors: Math.floor(Math.random() * 1000),
        variants: [
          {
            name: '控制组',
            visitors: Math.floor(Math.random() * 500),
            conversions: Math.floor(Math.random() * 50)
          },
          {
            name: '变体A',
            visitors: Math.floor(Math.random() * 500),
            conversions: Math.floor(Math.random() * 50)
          }
        ],
        timestamp: Date.now()
      };
      
      this.sendToClient(ws, {
        type: 'ab_test_update',
        data: testData
      });
    } catch (error) {
      logger.error('Error sending AB test update:', error);
    }
  }

  // 通知A/B测试状态变化
  notifyABTestStatusChange(testId, status, data) {
    const roomId = `ab_test_${testId}`;
    this.broadcastToRoom(roomId, {
      type: 'ab_test_status_change',
      data: {
        testId,
        status,
        ...data,
        timestamp: Date.now()
      }
    });
  }

  // 通知自动化规则执行
  notifyAutomationExecution(ruleId, execution) {
    const roomId = `automation_${ruleId}`;
    this.broadcastToRoom(roomId, {
      type: 'automation_execution',
      data: {
        ruleId,
        execution,
        timestamp: Date.now()
      }
    });
  }

  // 通知系统告警
  notifySystemAlert(alert) {
    this.broadcast({
      type: 'system_alert',
      data: {
        ...alert,
        timestamp: Date.now()
      }
    });
  }

  // 获取连接统计
  getStats() {
    return {
      ...this.connectionStats,
      connectedUsers: this.clients.size,
      activeRooms: Array.from(this.rooms.keys())
    };
  }

  // 关闭WebSocket服务器
  close() {
    this.wss.close();
    logger.info('WebSocket server closed');
  }
}

module.exports = WebSocketManager;