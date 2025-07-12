const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'owner', 'manager', 'viewer'],
    default: 'user'
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: false
  },
  organizationRole: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'user', 'viewer'],
    default: 'user'
  },
  permissions: {
    domains: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    pages: {
      create: { type: Boolean, default: true },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    analytics: {
      read: { type: Boolean, default: true },
      export: { type: Boolean, default: false }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    theme: { type: String, default: 'light' },
    language: { type: String, default: 'zh-CN' }
  },
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    phone: String
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);