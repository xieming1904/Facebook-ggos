const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Facebook广告落地页管理系统 API',
      version: '4.0.0',
      description: `
        # Facebook广告落地页管理系统

        这是一个企业级的Facebook广告落地页管理系统，提供完整的API接口用于：

        ## 核心功能
        - 🔐 用户认证与授权管理
        - 🏢 多租户组织管理
        - 🌐 域名管理系统
        - 📄 落地页创建与管理
        - 🕵️ Facebook Cloak反检测
        - 🧪 A/B测试系统
        - 🤖 自动化规则引擎
        - 📊 实时分析统计
        - 💬 WebSocket实时通信
        - ⚡ Redis缓存系统
        - 📋 队列任务系统

        ## 认证方式
        本API使用JWT Bearer Token进行认证。在请求头中添加：
        \`Authorization: Bearer <your-token>\`

        ## 多租户支持
        系统支持多租户架构，可通过以下方式指定租户：
        - 请求头: \`X-Tenant-ID\` 或 \`X-Organization-ID\`
        - 子域名: \`{tenant}.yourdomain.com\`

        ## 限流政策
        - 普通用户: 100请求/15分钟
        - 企业用户: 1000请求/15分钟
        - 系统管理员: 5000请求/15分钟
      `,
      contact: {
        name: 'API支持',
        email: 'support@example.com',
        url: 'https://example.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: '开发环境'
      },
      {
        url: 'https://api.example.com/api',
        description: '生产环境'
      },
      {
        url: 'https://staging-api.example.com/api',
        description: '测试环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT认证令牌'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API密钥认证'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: '用户ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j1'
            },
            username: {
              type: 'string',
              description: '用户名',
              minLength: 3,
              maxLength: 30,
              example: 'johndoe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址',
              example: 'john@example.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'owner', 'manager', 'viewer'],
              description: '用户角色',
              example: 'user'
            },
            organizationId: {
              type: 'string',
              description: '所属组织ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j2'
            },
            organizationRole: {
              type: 'string',
              enum: ['owner', 'admin', 'manager', 'user', 'viewer'],
              description: '组织内角色',
              example: 'manager'
            },
            isActive: {
              type: 'boolean',
              description: '是否激活',
              example: true
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: '最后登录时间',
              example: '2023-12-01T10:30:00Z'
            },
            settings: {
              type: 'object',
              properties: {
                notifications: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean', example: true },
                    push: { type: 'boolean', example: true }
                  }
                },
                theme: { type: 'string', example: 'light' },
                language: { type: 'string', example: 'zh-CN' }
              }
            },
            profile: {
              type: 'object',
              properties: {
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                phone: { type: 'string', example: '+86 138 0000 0000' }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
              example: '2023-11-01T10:30:00Z'
            }
          }
        },
        Organization: {
          type: 'object',
          required: ['name', 'createdBy', 'ownerId'],
          properties: {
            _id: {
              type: 'string',
              description: '组织ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j2'
            },
            name: {
              type: 'string',
              description: '组织名称',
              maxLength: 100,
              example: 'Acme Corporation'
            },
            slug: {
              type: 'string',
              description: '组织标识符',
              pattern: '^[a-z0-9-]+$',
              example: 'acme-corp'
            },
            description: {
              type: 'string',
              description: '组织描述',
              maxLength: 500,
              example: '一家专业的数字营销公司'
            },
            subscription: {
              type: 'object',
              properties: {
                plan: {
                  type: 'string',
                  enum: ['free', 'basic', 'pro', 'enterprise'],
                  description: '订阅计划',
                  example: 'pro'
                },
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'suspended', 'cancelled'],
                  description: '订阅状态',
                  example: 'active'
                },
                limits: {
                  type: 'object',
                  properties: {
                    users: { type: 'integer', example: 50 },
                    domains: { type: 'integer', example: 100 },
                    landingPages: { type: 'integer', example: 500 },
                    monthlyVisitors: { type: 'integer', example: 100000 }
                  }
                }
              }
            },
            statistics: {
              type: 'object',
              properties: {
                totalUsers: { type: 'integer', example: 25 },
                totalDomains: { type: 'integer', example: 15 },
                totalPages: { type: 'integer', example: 120 },
                totalVisitors: { type: 'integer', example: 85000 },
                totalRevenue: { type: 'number', example: 125000.50 }
              }
            }
          }
        },
        LandingPage: {
          type: 'object',
          required: ['name', 'domainId'],
          properties: {
            _id: {
              type: 'string',
              description: '落地页ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j3'
            },
            name: {
              type: 'string',
              description: '落地页名称',
              example: '产品推广页面'
            },
            domainId: {
              type: 'string',
              description: '关联域名ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j4'
            },
            organizationId: {
              type: 'string',
              description: '所属组织ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j2'
            },
            type: {
              type: 'string',
              enum: ['main', 'cloak', 'redirect'],
              description: '页面类型',
              example: 'main'
            },
            content: {
              type: 'object',
              properties: {
                html: { type: 'string', description: 'HTML内容' },
                css: { type: 'string', description: 'CSS样式' },
                js: { type: 'string', description: 'JavaScript代码' }
              }
            },
            seo: {
              type: 'object',
              properties: {
                title: { type: 'string', example: '产品推广 - 最佳选择' },
                description: { type: 'string', example: '高质量产品，优惠价格，立即购买' },
                keywords: { type: 'string', example: '产品,推广,优惠,购买' }
              }
            },
            isActive: {
              type: 'boolean',
              description: '是否激活',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
              example: '2023-11-01T10:30:00Z'
            }
          }
        },
        ABTest: {
          type: 'object',
          required: ['name', 'pageId', 'variants'],
          properties: {
            _id: {
              type: 'string',
              description: 'A/B测试ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j5'
            },
            name: {
              type: 'string',
              description: '测试名称',
              example: '首页转化率优化'
            },
            description: {
              type: 'string',
              description: '测试描述',
              example: '测试不同的CTA按钮颜色对转化率的影响'
            },
            pageId: {
              type: 'string',
              description: '测试页面ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j3'
            },
            status: {
              type: 'string',
              enum: ['draft', 'running', 'paused', 'completed', 'failed'],
              description: '测试状态',
              example: 'running'
            },
            variants: {
              type: 'array',
              description: '测试变体',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'control' },
                  name: { type: 'string', example: '控制组' },
                  percentage: { type: 'number', example: 50 },
                  isControl: { type: 'boolean', example: true }
                }
              }
            },
            results: {
              type: 'object',
              properties: {
                totalVisitors: { type: 'integer', example: 10000 },
                variantResults: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      variantId: { type: 'string', example: 'control' },
                      visitors: { type: 'integer', example: 5000 },
                      conversions: { type: 'integer', example: 250 },
                      conversionRate: { type: 'number', example: 5.0 }
                    }
                  }
                }
              }
            }
          }
        },
        AutomationRule: {
          type: 'object',
          required: ['name', 'trigger', 'actions'],
          properties: {
            _id: {
              type: 'string',
              description: '自动化规则ID',
              example: '64f1a2b3c4d5e6f7g8h9i0j6'
            },
            name: {
              type: 'string',
              description: '规则名称',
              example: '每日数据报告'
            },
            description: {
              type: 'string',
              description: '规则描述',
              example: '每天上午9点发送前一天的数据报告'
            },
            isActive: {
              type: 'boolean',
              description: '是否激活',
              example: true
            },
            trigger: {
              type: 'object',
              description: '触发条件',
              properties: {
                type: {
                  type: 'string',
                  enum: ['schedule', 'event', 'condition', 'webhook'],
                  example: 'schedule'
                },
                config: {
                  type: 'object',
                  description: '触发配置'
                }
              }
            },
            actions: {
              type: 'array',
              description: '执行动作',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['email', 'sms', 'webhook', 'slack'],
                    example: 'email'
                  },
                  config: {
                    type: 'object',
                    description: '动作配置'
                  }
                }
              }
            },
            executionStats: {
              type: 'object',
              properties: {
                totalExecutions: { type: 'integer', example: 30 },
                successfulExecutions: { type: 'integer', example: 28 },
                failedExecutions: { type: 'integer', example: 2 },
                lastExecution: {
                  type: 'string',
                  format: 'date-time',
                  example: '2023-12-01T09:00:00Z'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: '错误信息',
              example: '请求参数无效'
            },
            code: {
              type: 'string',
              description: '错误代码',
              example: 'VALIDATION_ERROR'
            },
            details: {
              type: 'object',
              description: '错误详情'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '错误时间',
              example: '2023-12-01T10:30:00Z'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: '响应数据'
            },
            message: {
              type: 'string',
              description: '成功信息',
              example: '操作成功'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '响应时间',
              example: '2023-12-01T10:30:00Z'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array',
              description: '数据列表',
              items: {
                type: 'object'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
                pages: { type: 'integer', example: 5 },
                hasNext: { type: 'boolean', example: true },
                hasPrev: { type: 'boolean', example: false }
              }
            }
          }
        }
      },
      parameters: {
        TenantId: {
          name: 'X-Tenant-ID',
          in: 'header',
          description: '租户ID',
          schema: {
            type: 'string'
          },
          example: '64f1a2b3c4d5e6f7g8h9i0j2'
        },
        Page: {
          name: 'page',
          in: 'query',
          description: '页码',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        Limit: {
          name: 'limit',
          in: 'query',
          description: '每页数量',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        Sort: {
          name: 'sort',
          in: 'query',
          description: '排序字段',
          schema: {
            type: 'string'
          },
          example: 'createdAt:-1'
        },
        Search: {
          name: 'search',
          in: 'query',
          description: '搜索关键词',
          schema: {
            type: 'string'
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: '未授权访问',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '未授权访问',
                code: 'UNAUTHORIZED',
                timestamp: '2023-12-01T10:30:00Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: '禁止访问',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '权限不足',
                code: 'FORBIDDEN',
                timestamp: '2023-12-01T10:30:00Z'
              }
            }
          }
        },
        NotFoundError: {
          description: '资源不存在',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '资源不存在',
                code: 'NOT_FOUND',
                timestamp: '2023-12-01T10:30:00Z'
              }
            }
          }
        },
        ValidationError: {
          description: '参数验证错误',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '参数验证失败',
                code: 'VALIDATION_ERROR',
                details: {
                  username: '用户名必须至少3个字符',
                  email: '邮箱格式不正确'
                },
                timestamp: '2023-12-01T10:30:00Z'
              }
            }
          }
        },
        RateLimitError: {
          description: '请求频率限制',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: '请求过于频繁',
                code: 'RATE_LIMIT_EXCEEDED',
                timestamp: '2023-12-01T10:30:00Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: '认证',
        description: '用户认证相关接口'
      },
      {
        name: '用户管理',
        description: '用户管理相关接口'
      },
      {
        name: '组织管理',
        description: '组织管理相关接口'
      },
      {
        name: '域名管理',
        description: '域名管理相关接口'
      },
      {
        name: '落地页管理',
        description: '落地页管理相关接口'
      },
      {
        name: 'A/B测试',
        description: 'A/B测试相关接口'
      },
      {
        name: '自动化',
        description: '自动化规则相关接口'
      },
      {
        name: '分析统计',
        description: '数据分析相关接口'
      },
      {
        name: '系统管理',
        description: '系统管理相关接口'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/docs/paths/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};