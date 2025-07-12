const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateEmail, validatePassword, validateUsername, validateObjectIdParam } = require('../utils/validation');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // 验证必需字段
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }
    
    // 验证邮箱格式
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
    
    // 验证用户名格式
    if (!validateUsername(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores' 
      });
    }
    
    // 验证密码强度
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }
    
    // 验证角色
    const validRoles = ['admin', 'user', 'owner', 'manager', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role specified' 
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists' 
      });
    }
    
    // 创建新用户
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || 'user'
    });
    
    await user.save();
    
    // 验证JWT_SECRET环境变量
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证必需字段
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }
    
    // 验证输入长度
    if (username.length > 255 || password.length > 255) {
      return res.status(400).json({ 
        error: 'Input too long' 
      });
    }
    
    // 查找用户
    const user = await User.findOne({ 
      $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }] 
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }
    
    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();
    
    // 验证JWT_SECRET环境变量
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 获取用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// 修改密码
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 验证当前密码
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // 更新密码
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// 管理员获取所有用户
router.get('/users', auth, async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    
    res.json({ users });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// 管理员更新用户状态
router.put('/users/:id/status', auth, validateObjectIdParam(), async (req, res) => {
  try {
    // 检查权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { isActive } = req.body;
    
    // 验证 isActive 参数
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean value' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User status updated', user });
    
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;