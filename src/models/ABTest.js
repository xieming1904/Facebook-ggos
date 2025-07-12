const mongoose = require('mongoose');

const abTestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'running', 'paused', 'completed'],
    default: 'draft'
  },
  type: {
    type: String,
    enum: ['page_variant', 'traffic_split', 'conversion_funnel'],
    default: 'page_variant'
  },
  
  // 测试配置
  config: {
    trafficSplit: {
      type: Number,
      default: 50,
      min: 1,
      max: 99
    },
    duration: {
      type: Number, // 天数
      default: 7
    },
    minSampleSize: {
      type: Number,
      default: 100
    },
    confidenceLevel: {
      type: Number,
      default: 95,
      min: 80,
      max: 99
    },
    significanceThreshold: {
      type: Number,
      default: 0.05
    }
  },
  
  // 变体页面
  variants: [{
    name: {
      type: String,
      required: true
    },
    landingPageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LandingPage',
      required: true
    },
    weight: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    isControl: {
      type: Boolean,
      default: false
    }
  }],
  
  // 目标和KPI
  goals: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['click', 'conversion', 'engagement', 'custom'],
      required: true
    },
    target: {
      type: String, // CSS选择器或URL
      required: true
    },
    weight: {
      type: Number,
      default: 1
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // 测试统计
  statistics: {
    totalVisitors: { type: Number, default: 0 },
    variantStats: [{
      variantId: mongoose.Schema.Types.ObjectId,
      visitors: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      avgSessionDuration: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 }
    }],
    winner: {
      variantId: mongoose.Schema.Types.ObjectId,
      confidenceLevel: Number,
      improvement: Number
    }
  },
  
  // 时间信息
  startDate: Date,
  endDate: Date,
  actualEndDate: Date,
  
  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// 索引
abTestSchema.index({ status: 1, createdAt: -1 });
abTestSchema.index({ createdBy: 1, status: 1 });
abTestSchema.index({ startDate: 1, endDate: 1 });

// 虚拟字段
abTestSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

abTestSchema.virtual('isActive').get(function() {
  return this.status === 'running' && 
         this.startDate <= new Date() && 
         (!this.endDate || this.endDate >= new Date());
});

// 中间件
abTestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // 验证变体权重总和为100
  const totalWeight = this.variants.reduce((sum, variant) => sum + variant.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.1) {
    return next(new Error('Variant weights must sum to 100'));
  }
  
  // 确保至少有一个主要目标
  const primaryGoals = this.goals.filter(goal => goal.isPrimary);
  if (primaryGoals.length === 0 && this.goals.length > 0) {
    this.goals[0].isPrimary = true;
  }
  
  next();
});

// 实例方法
abTestSchema.methods.calculateStatistics = function() {
  // 计算统计显著性
  const variantA = this.statistics.variantStats[0];
  const variantB = this.statistics.variantStats[1];
  
  if (!variantA || !variantB || variantA.visitors < 30 || variantB.visitors < 30) {
    return { significant: false, reason: 'insufficient_data' };
  }
  
  // Z-test for conversion rate difference
  const p1 = variantA.conversions / variantA.visitors;
  const p2 = variantB.conversions / variantB.visitors;
  const n1 = variantA.visitors;
  const n2 = variantB.visitors;
  
  const pooledP = (variantA.conversions + variantB.conversions) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
  const z = Math.abs(p1 - p2) / se;
  const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
  
  return {
    significant: pValue < this.config.significanceThreshold,
    pValue,
    zScore: z,
    improvement: ((p2 - p1) / p1) * 100,
    winner: p2 > p1 ? variantB.variantId : variantA.variantId
  };
};

abTestSchema.methods.normalCDF = function(x) {
  // 标准正态分布累积分布函数的近似
  return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
};

abTestSchema.methods.erf = function(x) {
  // 误差函数的近似
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
};

module.exports = mongoose.model('ABTest', abTestSchema);