const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['system', 'user', 'cloak'],
    default: 'system'
  },
  general: {
    siteName: {
      type: String,
      default: 'Facebook广告系统'
    },
    siteDescription: {
      type: String,
      default: '专业的广告落地页管理系统'
    },
    maxFileSize: {
      type: Number,
      default: 10
    },
    allowedFileTypes: {
      type: String,
      default: 'jpg,jpeg,png,gif,pdf,zip'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    autoBackup: {
      type: Boolean,
      default: false
    },
    backupRetention: {
      type: Number,
      default: 30
    }
  },
  security: {
    loginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 30
    },
    sessionTimeout: {
      type: Number,
      default: 24
    },
    enableTwoFactor: {
      type: Boolean,
      default: false
    },
    passwordMinLength: {
      type: Number,
      default: 8
    },
    forceHttps: {
      type: Boolean,
      default: true
    },
    rateLimitRequests: {
      type: Number,
      default: 100
    },
    rateLimitWindow: {
      type: Number,
      default: 15
    }
  },
  cloak: {
    enableCloak: {
      type: Boolean,
      default: true
    },
    detectionSensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    autoUpdateRules: {
      type: Boolean,
      default: true
    },
    logRetention: {
      type: Number,
      default: 30
    },
    blockUnknownBots: {
      type: Boolean,
      default: false
    },
    customUserAgents: {
      type: String,
      default: ''
    },
    customIpRules: {
      type: String,
      default: ''
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

settingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Setting', settingSchema);