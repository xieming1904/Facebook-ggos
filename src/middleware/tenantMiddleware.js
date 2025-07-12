const Organization = require('../models/Organization');
const logger = require('../utils/logger');

// 多租户中间件
const tenantMiddleware = async (req, res, next) => {
  try {
    let organization = null;
    let tenantId = null;
    
    // 1. 从请求头获取租户信息
    const tenantHeader = req.headers['x-tenant-id'] || req.headers['x-organization-id'];
    if (tenantHeader) {
      tenantId = tenantHeader;
    }
    
    // 2. 从子域名获取租户信息
    if (!tenantId) {
      const host = req.get('host');
      if (host) {
        const subdomain = host.split('.')[0];
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
          organization = await Organization.findBySubdomain(subdomain);
          if (organization) {
            tenantId = organization._id.toString();
          }
        }
      }
    }
    
    // 3. 从用户信息获取租户信息（如果用户已登录）
    if (!tenantId && req.user && req.user.organizationId) {
      tenantId = req.user.organizationId.toString();
    }
    
    // 4. 查询组织信息
    if (tenantId && !organization) {
      organization = await Organization.findById(tenantId);
    }
    
    // 5. 验证组织状态
    if (organization) {
      if (!organization.isActive) {
        return res.status(403).json({
          error: 'Organization is not active',
          code: 'ORGANIZATION_INACTIVE'
        });
      }
      
      // 检查订阅状态
      if (organization.subscription.status !== 'active') {
        return res.status(402).json({
          error: 'Subscription is not active',
          code: 'SUBSCRIPTION_INACTIVE',
          data: {
            plan: organization.subscription.plan,
            status: organization.subscription.status
          }
        });
      }
    }
    
    // 6. 设置租户上下文
    req.tenant = {
      id: tenantId,
      organization: organization,
      slug: organization?.slug,
      name: organization?.name,
      settings: organization?.settings,
      subscription: organization?.subscription,
      limits: organization?.subscription?.limits,
      features: organization?.subscription?.features
    };
    
    // 7. 记录租户活动
    if (organization) {
      organization.statistics.lastActivityAt = new Date();
      await organization.save();
    }
    
    logger.debug(`Tenant context set: ${tenantId}`);
    next();
    
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'TENANT_ERROR'
    });
  }
};

// 要求租户中间件
const requireTenant = (req, res, next) => {
  if (!req.tenant?.id) {
    return res.status(400).json({
      error: 'Tenant context required',
      code: 'TENANT_REQUIRED'
    });
  }
  next();
};

// 检查功能权限中间件
const checkFeature = (feature) => {
  return (req, res, next) => {
    if (!req.tenant?.features?.[feature]) {
      return res.status(403).json({
        error: `Feature '${feature}' not available in current plan`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredFeature: feature
      });
    }
    next();
  };
};

// 检查使用限制中间件
const checkLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      const organization = req.tenant?.organization;
      if (!organization) {
        return next();
      }
      
      const limits = organization.subscription.limits;
      const stats = organization.statistics;
      
      let canProceed = true;
      let currentUsage = 0;
      let limit = 0;
      
      switch (limitType) {
        case 'users':
          currentUsage = stats.totalUsers;
          limit = limits.users;
          canProceed = currentUsage < limit;
          break;
        case 'domains':
          currentUsage = stats.totalDomains;
          limit = limits.domains;
          canProceed = currentUsage < limit;
          break;
        case 'landingPages':
          currentUsage = stats.totalPages;
          limit = limits.landingPages;
          canProceed = currentUsage < limit;
          break;
        case 'monthlyVisitors':
          currentUsage = stats.totalVisitors;
          limit = limits.monthlyVisitors;
          canProceed = currentUsage < limit;
          break;
      }
      
      if (!canProceed) {
        return res.status(429).json({
          error: `${limitType} limit exceeded`,
          code: 'LIMIT_EXCEEDED',
          currentUsage,
          limit,
          limitType
        });
      }
      
      next();
    } catch (error) {
      logger.error('Check limit middleware error:', error);
      next();
    }
  };
};

// 租户隔离查询助手
const addTenantFilter = (req, filter = {}) => {
  if (req.tenant?.id) {
    filter.organizationId = req.tenant.id;
  }
  return filter;
};

// 租户隔离数据助手
const addTenantData = (req, data = {}) => {
  if (req.tenant?.id) {
    data.organizationId = req.tenant.id;
  }
  return data;
};

// 获取租户配置
const getTenantConfig = (req, key, defaultValue = null) => {
  return req.tenant?.settings?.[key] || defaultValue;
};

// 格式化数据根据租户设置
const formatByTenant = (req, data) => {
  const settings = req.tenant?.settings;
  if (!settings) return data;
  
  // 格式化货币
  if (typeof data === 'number' && settings.currency) {
    const formatter = new Intl.NumberFormat(settings.language || 'zh-CN', {
      style: 'currency',
      currency: settings.currency
    });
    return formatter.format(data);
  }
  
  // 格式化日期
  if (data instanceof Date && settings.dateFormat) {
    const moment = require('moment');
    return moment(data).format(settings.dateFormat);
  }
  
  return data;
};

// 获取租户统计信息
const getTenantStats = async (req) => {
  const organization = req.tenant?.organization;
  if (!organization) return null;
  
  const stats = organization.statistics;
  const limits = organization.subscription.limits;
  
  return {
    usage: {
      users: { current: stats.totalUsers, limit: limits.users },
      domains: { current: stats.totalDomains, limit: limits.domains },
      pages: { current: stats.totalPages, limit: limits.landingPages },
      visitors: { current: stats.totalVisitors, limit: limits.monthlyVisitors }
    },
    subscription: {
      plan: organization.subscription.plan,
      status: organization.subscription.status,
      daysLeft: organization.subscriptionDaysLeft
    },
    warnings: organization.checkLimits()
  };
};

// 更新租户使用量
const updateTenantUsage = async (req, type, count = 1) => {
  const organization = req.tenant?.organization;
  if (!organization) return;
  
  organization.incrementUsage(type, count);
  await organization.save();
};

// 租户日志记录
const logTenantActivity = (req, action, data = {}) => {
  logger.info('Tenant activity', {
    tenantId: req.tenant?.id,
    tenantName: req.tenant?.name,
    userId: req.user?.userId,
    action,
    data,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  tenantMiddleware,
  requireTenant,
  checkFeature,
  checkLimit,
  addTenantFilter,
  addTenantData,
  getTenantConfig,
  formatByTenant,
  getTenantStats,
  updateTenantUsage,
  logTenantActivity
};