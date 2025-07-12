import { Request } from 'express';
import { Document, Types } from 'mongoose';

// 用户相关类型
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'owner' | 'manager' | 'viewer';
  organizationId?: Types.ObjectId;
  organizationRole: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  permissions: {
    domains: PermissionSet;
    pages: PermissionSet;
    analytics: PermissionSet;
  };
  isActive: boolean;
  lastLogin?: Date;
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
    };
    theme: string;
    language: string;
  };
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    phone?: string;
  };
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface PermissionSet {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

// 组织相关类型
export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  settings: {
    timezone: string;
    currency: 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY';
    language: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
    dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  };
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'suspended' | 'cancelled';
    startDate: Date;
    endDate?: Date;
    limits: SubscriptionLimits;
    features: SubscriptionFeatures;
  };
  branding: {
    logo?: string;
    favicon?: string;
    primaryColor: string;
    secondaryColor: string;
    customCSS?: string;
  };
  domains: {
    primary?: string;
    custom: string[];
    subdomain?: string;
  };
  statistics: OrganizationStats;
  createdBy: Types.ObjectId;
  ownerId: Types.ObjectId;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  subscriptionDaysLeft: number | null;
  usagePercentage: UsagePercentage;
}

export interface SubscriptionLimits {
  users: number;
  domains: number;
  landingPages: number;
  abTests: number;
  automationRules: number;
  monthlyVisitors: number;
  storage: number;
}

export interface SubscriptionFeatures {
  customDomain: boolean;
  advancedAnalytics: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface OrganizationStats {
  totalUsers: number;
  totalDomains: number;
  totalPages: number;
  totalVisitors: number;
  totalRevenue: number;
  lastActivityAt?: Date;
}

export interface UsagePercentage {
  users: number;
  domains: number;
  landingPages: number;
  monthlyVisitors: number;
}

// A/B测试相关类型
export interface IABTest extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  organizationId: Types.ObjectId;
  pageId: Types.ObjectId;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  variants: ABTestVariant[];
  trafficSplit: TrafficSplit;
  conversionGoals: ConversionGoal[];
  statisticalMethod: 'frequentist' | 'bayesian';
  significance: number;
  minSampleSize: number;
  maxDuration: number;
  startDate?: Date;
  endDate?: Date;
  winnerVariant?: string;
  results: ABTestResults;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description?: string;
  percentage: number;
  content: {
    html?: string;
    css?: string;
    js?: string;
    redirect?: string;
  };
  isControl: boolean;
}

export interface TrafficSplit {
  method: 'percentage' | 'custom';
  rules: Array<{
    condition: string;
    percentage: number;
  }>;
}

export interface ConversionGoal {
  id: string;
  name: string;
  type: 'click' | 'form_submit' | 'page_view' | 'custom';
  selector?: string;
  value?: number;
  isPrimary: boolean;
}

export interface ABTestResults {
  totalVisitors: number;
  variantResults: Array<{
    variantId: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    significance?: number;
    confidence?: number;
  }>;
  winner?: {
    variantId: string;
    confidence: number;
    improvement: number;
  };
}

// 自动化规则相关类型
export interface IAutomationRule extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  organizationId: Types.ObjectId;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  executionStats: ExecutionStats;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: 'schedule' | 'event' | 'condition' | 'webhook';
  config: {
    schedule?: {
      cron: string;
      timezone: string;
    };
    event?: {
      type: string;
      filters: Record<string, any>;
    };
    condition?: {
      metric: string;
      operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
      value: number;
      timeframe: string;
    };
    webhook?: {
      url: string;
      secret: string;
      headers: Record<string, string>;
    };
  };
}

export interface AutomationCondition {
  id: string;
  type: 'and' | 'or';
  rules: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
    value: any;
  }>;
}

export interface AutomationAction {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'update_record' | 'create_record' | 'delete_record' | 'run_script' | 'pause_ab_test' | 'backup_data' | 'restart_service';
  config: Record<string, any>;
  retryPolicy: {
    maxRetries: number;
    backoffType: 'fixed' | 'exponential';
    backoffDelay: number;
  };
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecution?: Date;
  lastError?: string;
  avgExecutionTime: number;
}

// 请求扩展类型
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
    organizationId?: string;
  };
  tenant?: {
    id?: string;
    organization?: IOrganization;
    slug?: string;
    name?: string;
    settings?: any;
    subscription?: any;
    limits?: SubscriptionLimits;
    features?: SubscriptionFeatures;
  };
}

// WebSocket相关类型
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

export interface WebSocketRoom {
  id: string;
  users: Set<string>;
  metadata?: Record<string, any>;
}

export interface WebSocketClient {
  id: string;
  userId: string;
  user: IUser;
  socket: any;
  rooms: Set<string>;
  lastActivity: Date;
}

// 缓存相关类型
export interface CacheOptions {
  ttl?: number;
  tenant?: string;
  tags?: string[];
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// 队列相关类型
export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  options: {
    priority?: number;
    delay?: number;
    attempts?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  };
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

// 分析数据相关类型
export interface AnalyticsData {
  pageId: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  event: {
    type: 'pageview' | 'click' | 'conversion' | 'exit';
    data: Record<string, any>;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    userAgent: string;
  };
  location: {
    country: string;
    region: string;
    city: string;
    ip: string;
  };
  referrer?: {
    source: string;
    medium: string;
    campaign?: string;
  };
}

export interface AnalyticsMetrics {
  visitors: number;
  pageviews: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp: Date;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 系统监控相关类型
export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  processes: number;
  uptime: number;
  timestamp: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: string[];
  isActive: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// 导出所有类型
export * from './express';
export * from './mongoose';