const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // 触发条件
  trigger: {
    type: {
      type: String,
      enum: ['schedule', 'event', 'condition', 'webhook'],
      required: true
    },
    
    // 定时触发配置
    schedule: {
      cron: String, // Cron表达式
      timezone: {
        type: String,
        default: 'Asia/Shanghai'
      }
    },
    
    // 事件触发配置
    event: {
      type: String,
      enum: [
        'page_visit',
        'conversion',
        'ab_test_completed',
        'domain_down',
        'high_traffic',
        'low_conversion',
        'cloak_detected',
        'user_login',
        'system_error'
      ]
    },
    
    // 条件触发配置
    condition: {
      metric: {
        type: String,
        enum: [
          'conversion_rate',
          'traffic_volume',
          'page_load_time',
          'error_rate',
          'revenue',
          'ab_test_significance'
        ]
      },
      operator: {
        type: String,
        enum: ['>', '<', '>=', '<=', '==', '!=', 'contains', 'not_contains']
      },
      value: mongoose.Schema.Types.Mixed,
      timeframe: {
        type: String,
        enum: ['5min', '15min', '1hour', '6hour', '24hour', '7day'],
        default: '1hour'
      }
    },
    
    // Webhook触发配置
    webhook: {
      url: String,
      secret: String,
      headers: mongoose.Schema.Types.Mixed
    }
  },
  
  // 执行动作
  actions: [{
    type: {
      type: String,
      enum: [
        'send_email',
        'send_sms',
        'webhook_call',
        'pause_campaign',
        'switch_page',
        'update_cloak_settings',
        'backup_data',
        'restart_service',
        'send_slack',
        'create_ticket',
        'auto_scale'
      ],
      required: true
    },
    
    // 邮件动作配置
    email: {
      to: [String],
      cc: [String],
      subject: String,
      template: String,
      variables: mongoose.Schema.Types.Mixed
    },
    
    // 短信动作配置
    sms: {
      to: [String],
      message: String,
      variables: mongoose.Schema.Types.Mixed
    },
    
    // Webhook动作配置
    webhook: {
      url: String,
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
        default: 'POST'
      },
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
      timeout: {
        type: Number,
        default: 30000
      }
    },
    
    // 系统动作配置
    system: {
      command: String,
      parameters: mongoose.Schema.Types.Mixed
    },
    
    // Slack通知配置
    slack: {
      webhook_url: String,
      channel: String,
      username: String,
      icon_emoji: String,
      message: String,
      variables: mongoose.Schema.Types.Mixed
    },
    
    // 延迟执行
    delay: {
      type: Number,
      default: 0 // 秒
    },
    
    // 条件执行
    condition: {
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed
    }
  }],
  
  // 执行配置
  execution: {
    // 最大执行次数
    maxExecutions: {
      type: Number,
      default: -1 // -1表示无限制
    },
    
    // 执行间隔（秒）
    cooldown: {
      type: Number,
      default: 300 // 5分钟
    },
    
    // 超时时间（秒）
    timeout: {
      type: Number,
      default: 300 // 5分钟
    },
    
    // 重试配置
    retry: {
      attempts: {
        type: Number,
        default: 3
      },
      delay: {
        type: Number,
        default: 60 // 秒
      },
      backoff: {
        type: String,
        enum: ['fixed', 'exponential'],
        default: 'exponential'
      }
    }
  },
  
  // 过滤条件
  filters: [{
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      enum: ['==', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains', 'not_contains', 'regex'],
      required: true
    },
    value: mongoose.Schema.Types.Mixed,
    logicalOperator: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND'
    }
  }],
  
  // 执行历史
  executions: [{
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'timeout', 'skipped'],
      required: true
    },
    duration: Number, // 毫秒
    result: mongoose.Schema.Types.Mixed,
    error: String,
    logs: [String]
  }],
  
  // 统计信息
  statistics: {
    totalExecutions: {
      type: Number,
      default: 0
    },
    successfulExecutions: {
      type: Number,
      default: 0
    },
    failedExecutions: {
      type: Number,
      default: 0
    },
    lastExecutedAt: Date,
    averageDuration: Number, // 毫秒
    lastStatus: String
  },
  
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
automationRuleSchema.index({ isActive: 1, 'trigger.type': 1 });
automationRuleSchema.index({ createdBy: 1, isActive: 1 });
automationRuleSchema.index({ 'trigger.event': 1, isActive: 1 });
automationRuleSchema.index({ 'executions.triggeredAt': -1 });

// 虚拟字段
automationRuleSchema.virtual('successRate').get(function() {
  if (this.statistics.totalExecutions === 0) return 0;
  return (this.statistics.successfulExecutions / this.statistics.totalExecutions) * 100;
});

automationRuleSchema.virtual('isHealthy').get(function() {
  return this.successRate >= 80 && this.statistics.totalExecutions > 0;
});

// 中间件
automationRuleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 实例方法
automationRuleSchema.methods.canExecute = function() {
  if (!this.isActive) return false;
  
  // 检查最大执行次数
  if (this.execution.maxExecutions > 0 && 
      this.statistics.totalExecutions >= this.execution.maxExecutions) {
    return false;
  }
  
  // 检查冷却时间
  if (this.statistics.lastExecutedAt) {
    const cooldownMs = this.execution.cooldown * 1000;
    const timeSinceLastExecution = Date.now() - this.statistics.lastExecutedAt.getTime();
    if (timeSinceLastExecution < cooldownMs) {
      return false;
    }
  }
  
  return true;
};

automationRuleSchema.methods.addExecution = function(execution) {
  // 添加执行记录
  this.executions.push(execution);
  
  // 更新统计信息
  this.statistics.totalExecutions += 1;
  if (execution.status === 'success') {
    this.statistics.successfulExecutions += 1;
  } else {
    this.statistics.failedExecutions += 1;
  }
  
  this.statistics.lastExecutedAt = execution.triggeredAt;
  this.statistics.lastStatus = execution.status;
  
  // 计算平均执行时间
  if (execution.duration) {
    const totalDuration = (this.statistics.averageDuration || 0) * (this.statistics.totalExecutions - 1) + execution.duration;
    this.statistics.averageDuration = totalDuration / this.statistics.totalExecutions;
  }
  
  // 只保留最近100条执行记录
  if (this.executions.length > 100) {
    this.executions = this.executions.slice(-100);
  }
};

automationRuleSchema.methods.evaluateFilters = function(data) {
  if (!this.filters || this.filters.length === 0) return true;
  
  let result = true;
  let currentOperator = 'AND';
  
  for (const filter of this.filters) {
    const fieldValue = getNestedValue(data, filter.field);
    const filterResult = evaluateCondition(fieldValue, filter.operator, filter.value);
    
    if (currentOperator === 'AND') {
      result = result && filterResult;
    } else if (currentOperator === 'OR') {
      result = result || filterResult;
    }
    
    currentOperator = filter.logicalOperator || 'AND';
  }
  
  return result;
};

// 静态方法
automationRuleSchema.statics.findActiveRules = function(triggerType, event = null) {
  const query = {
    isActive: true,
    'trigger.type': triggerType
  };
  
  if (event) {
    query['trigger.event'] = event;
  }
  
  return this.find(query);
};

automationRuleSchema.statics.getHealthyRules = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $addFields: {
        successRate: {
          $cond: {
            if: { $eq: ['$statistics.totalExecutions', 0] },
            then: 0,
            else: {
              $multiply: [
                { $divide: ['$statistics.successfulExecutions', '$statistics.totalExecutions'] },
                100
              ]
            }
          }
        }
      }
    },
    { $match: { successRate: { $gte: 80 } } }
  ]);
};

// 辅助函数
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function evaluateCondition(fieldValue, operator, expectedValue) {
  switch (operator) {
    case '==':
      return fieldValue == expectedValue;
    case '!=':
      return fieldValue != expectedValue;
    case '>':
      return Number(fieldValue) > Number(expectedValue);
    case '<':
      return Number(fieldValue) < Number(expectedValue);
    case '>=':
      return Number(fieldValue) >= Number(expectedValue);
    case '<=':
      return Number(fieldValue) <= Number(expectedValue);
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
    case 'contains':
      return String(fieldValue).includes(String(expectedValue));
    case 'not_contains':
      return !String(fieldValue).includes(String(expectedValue));
    case 'regex':
      try {
        const regex = new RegExp(expectedValue);
        return regex.test(String(fieldValue));
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
}

module.exports = mongoose.model('AutomationRule', automationRuleSchema);