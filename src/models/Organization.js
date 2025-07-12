const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // 组织设置
  settings: {
    timezone: {
      type: String,
      default: 'Asia/Shanghai'
    },
    currency: {
      type: String,
      default: 'CNY',
      enum: ['CNY', 'USD', 'EUR', 'GBP', 'JPY']
    },
    language: {
      type: String,
      default: 'zh-CN',
      enum: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR']
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
      enum: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY']
    }
  },
  
  // 订阅计划
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    limits: {
      users: {
        type: Number,
        default: 5
      },
      domains: {
        type: Number,
        default: 10
      },
      landingPages: {
        type: Number,
        default: 50
      },
      abTests: {
        type: Number,
        default: 10
      },
      automationRules: {
        type: Number,
        default: 20
      },
      monthlyVisitors: {
        type: Number,
        default: 10000
      },
      storage: {
        type: Number,
        default: 1024 // MB
      }
    },
    features: {
      customDomain: {
        type: Boolean,
        default: false
      },
      advancedAnalytics: {
        type: Boolean,
        default: false
      },
      whiteLabel: {
        type: Boolean,
        default: false
      },
      apiAccess: {
        type: Boolean,
        default: false
      },
      prioritySupport: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // 品牌定制
  branding: {
    logo: String,
    favicon: String,
    primaryColor: {
      type: String,
      default: '#1890ff'
    },
    secondaryColor: {
      type: String,
      default: '#52c41a'
    },
    customCSS: String
  },
  
  // 域名设置
  domains: {
    primary: String,
    custom: [String],
    subdomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true
    }
  },
  
  // 统计信息
  statistics: {
    totalUsers: {
      type: Number,
      default: 0
    },
    totalDomains: {
      type: Number,
      default: 0
    },
    totalPages: {
      type: Number,
      default: 0
    },
    totalVisitors: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastActivityAt: Date
  },
  
  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
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

// 索引
organizationSchema.index({ slug: 1 });
organizationSchema.index({ 'domains.subdomain': 1 });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ status: 1, 'subscription.status': 1 });
organizationSchema.index({ createdAt: -1 });

// 虚拟字段
organizationSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.subscription.status === 'active';
});

organizationSchema.virtual('subscriptionDaysLeft').get(function() {
  if (!this.subscription.endDate) return null;
  const today = new Date();
  const endDate = new Date(this.subscription.endDate);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

organizationSchema.virtual('usagePercentage').get(function() {
  const limits = this.subscription.limits;
  const stats = this.statistics;
  
  return {
    users: Math.round((stats.totalUsers / limits.users) * 100),
    domains: Math.round((stats.totalDomains / limits.domains) * 100),
    landingPages: Math.round((stats.totalPages / limits.landingPages) * 100),
    monthlyVisitors: Math.round((stats.totalVisitors / limits.monthlyVisitors) * 100)
  };
});

// 中间件
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // 生成slug
  if (this.isNew && !this.slug) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // 生成子域名
  if (this.isNew && !this.domains.subdomain) {
    this.domains.subdomain = this.slug;
  }
  
  next();
});

// 实例方法
organizationSchema.methods.canCreateUser = function() {
  return this.statistics.totalUsers < this.subscription.limits.users;
};

organizationSchema.methods.canCreateDomain = function() {
  return this.statistics.totalDomains < this.subscription.limits.domains;
};

organizationSchema.methods.canCreatePage = function() {
  return this.statistics.totalPages < this.subscription.limits.landingPages;
};

organizationSchema.methods.hasFeature = function(feature) {
  return this.subscription.features[feature] === true;
};

organizationSchema.methods.incrementUsage = function(type, count = 1) {
  switch (type) {
    case 'users':
      this.statistics.totalUsers += count;
      break;
    case 'domains':
      this.statistics.totalDomains += count;
      break;
    case 'pages':
      this.statistics.totalPages += count;
      break;
    case 'visitors':
      this.statistics.totalVisitors += count;
      break;
    case 'revenue':
      this.statistics.totalRevenue += count;
      break;
  }
  this.statistics.lastActivityAt = new Date();
};

organizationSchema.methods.decrementUsage = function(type, count = 1) {
  switch (type) {
    case 'users':
      this.statistics.totalUsers = Math.max(0, this.statistics.totalUsers - count);
      break;
    case 'domains':
      this.statistics.totalDomains = Math.max(0, this.statistics.totalDomains - count);
      break;
    case 'pages':
      this.statistics.totalPages = Math.max(0, this.statistics.totalPages - count);
      break;
  }
};

organizationSchema.methods.checkLimits = function() {
  const limits = this.subscription.limits;
  const stats = this.statistics;
  const warnings = [];
  
  if (stats.totalUsers >= limits.users * 0.8) {
    warnings.push({
      type: 'users',
      message: `用户数量接近限制 (${stats.totalUsers}/${limits.users})`
    });
  }
  
  if (stats.totalDomains >= limits.domains * 0.8) {
    warnings.push({
      type: 'domains',
      message: `域名数量接近限制 (${stats.totalDomains}/${limits.domains})`
    });
  }
  
  if (stats.totalPages >= limits.landingPages * 0.8) {
    warnings.push({
      type: 'pages',
      message: `落地页数量接近限制 (${stats.totalPages}/${limits.landingPages})`
    });
  }
  
  if (stats.totalVisitors >= limits.monthlyVisitors * 0.8) {
    warnings.push({
      type: 'visitors',
      message: `月访问量接近限制 (${stats.totalVisitors}/${limits.monthlyVisitors})`
    });
  }
  
  return warnings;
};

// 静态方法
organizationSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' });
};

organizationSchema.statics.findBySubdomain = function(subdomain) {
  return this.findOne({ 'domains.subdomain': subdomain, status: 'active' });
};

organizationSchema.statics.getActiveOrganizations = function() {
  return this.find({ 
    status: 'active', 
    'subscription.status': 'active' 
  }).sort({ createdAt: -1 });
};

organizationSchema.statics.getUsageStatistics = function() {
  return this.aggregate([
    {
      $match: { status: 'active' }
    },
    {
      $group: {
        _id: '$subscription.plan',
        count: { $sum: 1 },
        totalUsers: { $sum: '$statistics.totalUsers' },
        totalPages: { $sum: '$statistics.totalPages' },
        totalVisitors: { $sum: '$statistics.totalVisitors' },
        totalRevenue: { $sum: '$statistics.totalRevenue' }
      }
    }
  ]);
};

module.exports = mongoose.model('Organization', organizationSchema);