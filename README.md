# Facebook广告落地页管理系统 v3.0

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-brightgreen.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18%2B-blue.svg)](https://reactjs.org/)

一个专业的Facebook广告落地页管理系统，集成先进的Cloak技术、A/B测试功能和智能自动化规则引擎，为广告投放提供全方位的技术支持。

## 🚀 主要功能

### 📊 仪表盘与分析
- **实时数据监控**: 访问量、转化率、收入统计
- **可视化图表**: 多维度数据展示，支持时间范围筛选
- **性能指标**: 页面加载时间、跳出率、用户行为分析
- **导出功能**: 支持Excel、CSV格式数据导出
- **预警系统**: 异常数据自动告警通知

### 🌐 域名管理
- **多域名支持**: 批量添加、管理多个域名
- **SSL证书管理**: 自动申请、续期Let's Encrypt证书
- **域名健康检查**: 实时监控域名可用性
- **DNS配置助手**: 自动化DNS配置指导
- **负载均衡**: 智能域名轮询分配

### 📄 落地页管理
- **可视化编辑器**: 集成Monaco Editor，支持HTML/CSS/JavaScript
- **多设备预览**: 桌面端、平板、手机端实时预览
- **模板系统**: 内置新闻、博客等多种模板
- **版本控制**: 页面版本管理，支持回滚
- **SEO优化**: 自动生成meta标签，搜索引擎优化
- **性能优化**: 代码压缩、图片优化、缓存策略

### 🧪 A/B测试系统 ✨ 新功能
- **多变体测试**: 支持多个页面变体对比测试
- **智能分流**: 基于权重的访问流量分配
- **统计分析**: 专业的统计显著性检验（Z-test）
- **实时监控**: 测试进度、转化率实时追踪
- **自动化决策**: 基于统计结果自动选择最优变体
- **转化目标**: 支持多种转化目标跟踪
- **详细报告**: 生成专业的测试报告

### 🤖 自动化规则引擎 ✨ 新功能
- **多触发方式**: 定时、事件、条件、Webhook触发
- **丰富的动作**: 邮件、短信、Slack通知、系统操作
- **条件过滤**: 复杂的条件逻辑组合
- **执行历史**: 详细的执行记录和统计分析
- **模板库**: 预设常用自动化规则模板
- **性能监控**: 规则执行性能和健康状态监控
- **重试机制**: 支持失败重试和指数退避

### �️ Cloak功能
- **智能检测**: 多维度识别Facebook爬虫和审核系统
- **IP范围检测**: Facebook官方IP段实时更新
- **User-Agent分析**: 深度分析用户代理特征
- **地理位置过滤**: 基于地理位置的访问控制
- **代理检测**: 识别代理服务器和VPN访问
- **行为分析**: 基于访问行为模式的智能判断
- **自定义规则**: 支持自定义检测规则和白名单

### 👥 用户管理
- **角色权限**: 管理员、编辑、查看者多级权限
- **操作日志**: 详细记录用户操作历史
- **安全认证**: JWT token + 密码加密
- **账户管理**: 用户注册、登录、密码重置
- **双因素认证**: 支持2FA安全验证

### ⚙️ 系统设置
- **全局配置**: 系统参数统一管理
- **安全设置**: 登录策略、密码策略配置
- **通知设置**: 邮件、短信、Slack通知配置
- **日志管理**: 系统日志查看、下载、清理
- **备份恢复**: 数据备份和恢复功能

## 📦 快速开始

### 环境要求

- Node.js 18+
- MongoDB 6.0+
- Nginx 1.18+
- SSL证书（推荐Let's Encrypt）

### 自动化部署

```bash
# 克隆项目
git clone https://github.com/your-repo/facebook-ads-system.git
cd facebook-ads-system

# 运行自动化部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

1. **安装依赖**
```bash
npm run install-all
```

2. **环境配置**
```bash
cp .env.example .env
# 编辑.env文件配置数据库、JWT密钥等
```

3. **构建前端**
```bash
npm run build
```

4. **启动服务**
```bash
npm start
```

## 🏗️ 项目结构

```
facebook-ads-system/
├── client/                    # React前端
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   ├── pages/            # 页面组件
│   │   │   ├── Dashboard.js   # 仪表盘
│   │   │   ├── LandingPages.js # 落地页管理
│   │   │   ├── ABTests.js     # A/B测试 ✨
│   │   │   ├── Automation.js  # 自动化规则 ✨
│   │   │   ├── Domains.js     # 域名管理
│   │   │   ├── Analytics.js   # 数据分析
│   │   │   ├── Settings.js    # 系统设置
│   │   │   └── Users.js       # 用户管理
│   │   ├── utils/            # 工具函数
│   │   └── App.js            # 应用入口
├── src/                      # Node.js后端
│   ├── models/               # 数据模型
│   │   ├── User.js
│   │   ├── Domain.js
│   │   ├── LandingPage.js
│   │   ├── ABTest.js         # A/B测试模型 ✨
│   │   ├── AutomationRule.js # 自动化规则模型 ✨
│   │   └── Setting.js
│   ├── routes/               # API路由
│   │   ├── auth.js
│   │   ├── domains.js
│   │   ├── landingPages.js
│   │   ├── abTests.js        # A/B测试API ✨
│   │   ├── automationRules.js # 自动化规则API ✨
│   │   ├── analytics.js
│   │   ├── settings.js
│   │   ├── system.js
│   │   └── logs.js
│   ├── middleware/           # 中间件
│   │   ├── auth.js
│   │   ├── cloakMiddleware.js
│   │   ├── abTestMiddleware.js # A/B测试中间件 ✨
│   │   └── loggerMiddleware.js
│   ├── utils/               # 工具函数
│   │   ├── logger.js
│   │   ├── automationEngine.js # 自动化引擎 ✨
│   │   └── helpers.js
│   └── server.js            # 服务器入口
├── deploy.sh                # 自动化部署脚本
├── package.json
└── README.md
```

## 🔧 配置说明

### 环境变量

```bash
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/facebook-ads

# JWT配置
JWT_SECRET=your-super-secret-jwt-key

# 邮件配置 (自动化通知)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Slack配置 (自动化通知)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# 系统配置
PORT=5000
NODE_ENV=production
```

### Nginx配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🧪 A/B测试功能详解

### 创建A/B测试

1. **配置测试基本信息**
   - 测试名称和描述
   - 测试类型（页面变体、流量分配、转化漏斗）
   - 测试时长和最小样本量

2. **设置测试变体**
   - 添加多个页面变体
   - 设置流量分配权重
   - 指定控制组和测试组

3. **定义转化目标**
   - 点击转化（按钮、链接）
   - 页面转化（表单提交、页面访问）
   - 自定义事件转化

4. **启动和监控**
   - 实时监控测试进度
   - 查看统计显著性
   - 自动停止和选择获胜变体

### 统计分析

系统使用专业的统计学方法进行A/B测试分析：

- **Z-test**: 用于比较两个变体的转化率差异
- **置信区间**: 默认95%置信水平
- **显著性检验**: P值计算和假设检验
- **最小样本量**: 确保测试结果的可靠性

## 🤖 自动化规则引擎详解

### 触发方式

1. **定时触发**
   - 支持Cron表达式
   - 自定义时区设置
   - 灵活的定时策略

2. **事件触发**
   - 页面访问事件
   - 转化事件
   - A/B测试完成事件
   - 系统错误事件

3. **条件触发**
   - 转化率阈值
   - 流量量监控
   - 错误率告警
   - 收入指标监控

4. **Webhook触发**
   - 外部系统集成
   - 实时事件推送
   - 安全验证机制

### 执行动作

1. **通知动作**
   - 邮件通知（支持HTML模板）
   - 短信通知
   - Slack消息推送
   - 自定义Webhook调用

2. **系统动作**
   - 暂停广告活动
   - 切换落地页
   - 更新Cloak设置
   - 数据备份
   - 服务重启

3. **高级功能**
   - 条件执行
   - 延迟执行
   - 重试机制
   - 变量模板

### 规则模板

系统提供常用的规则模板：

- **高流量告警**: 流量超过阈值时通知
- **低转化率告警**: 转化率低于阈值时通知
- **每日数据备份**: 定时备份重要数据
- **A/B测试完成通知**: 测试完成时自动通知
- **系统健康检查**: 定期检查系统状态

## 🛡️ Cloak功能详解

### 检测机制

1. **IP地址检测**
   - Facebook官方IP段
   - 数据中心IP识别
   - 地理位置过滤

2. **User-Agent分析**
   - 爬虫特征识别
   - 浏览器指纹分析
   - 设备类型检测

3. **行为分析**
   - 访问频率分析
   - 页面停留时间
   - 点击行为模式

4. **高级检测**
   - JavaScript执行检测
   - 代理服务器识别
   - 自动化工具检测

### 配置选项

```javascript
// Cloak配置示例
{
  "sensitivity": "high",           // 检测敏感度
  "ipBlacklist": [],              // IP黑名单
  "userAgentRules": [],           // User-Agent规则
  "geoBlocking": {
    "enabled": true,
    "blockedCountries": ["CN"]
  },
  "customRules": [
    {
      "name": "Block Headless Browsers",
      "condition": "navigator.webdriver === true",
      "action": "block"
    }
  ]
}
```

## 📊 性能监控

### 系统指标

- **响应时间**: API响应时间监控
- **错误率**: 系统错误率统计
- **并发用户**: 实时在线用户数
- **资源使用**: CPU、内存、磁盘使用率

### 业务指标

- **转化率**: 整体转化率趋势
- **流量质量**: 真实用户vs爬虫比例
- **域名健康**: 域名可用性监控
- **A/B测试效果**: 测试结果统计

## 🚀 部署指南

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 启动前端开发服务器
cd client && npm start
```

### 生产环境

```bash
# 使用PM2管理进程
npm install -g pm2
pm2 start src/server.js --name facebook-ads-system

# 使用Docker部署
docker build -t facebook-ads-system .
docker run -d -p 5000:5000 facebook-ads-system
```

### 云服务器部署

支持以下云服务商：

- **AWS**: EC2 + RDS + S3
- **阿里云**: ECS + RDS + OSS
- **腾讯云**: CVM + TencentDB + COS
- **数字海洋**: Droplet + Managed Database

## 📝 API文档

### 认证接口

```bash
# 用户登录
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}

# 用户注册
POST /api/auth/register
{
  "username": "newuser",
  "password": "password",
  "email": "user@example.com"
}
```

### A/B测试接口

```bash
# 创建A/B测试
POST /api/ab-tests
{
  "name": "Landing Page Test",
  "type": "page_variant",
  "variants": [
    {
      "name": "Control",
      "landingPageId": "page1",
      "weight": 50,
      "isControl": true
    },
    {
      "name": "Variant A",
      "landingPageId": "page2",
      "weight": 50,
      "isControl": false
    }
  ],
  "goals": [
    {
      "name": "Click CTA",
      "type": "click",
      "target": ".cta-button",
      "isPrimary": true
    }
  ]
}

# 启动A/B测试
POST /api/ab-tests/:id/start

# 获取测试统计
GET /api/ab-tests/:id/statistics
```

### 自动化规则接口

```bash
# 创建自动化规则
POST /api/automation-rules
{
  "name": "High Traffic Alert",
  "trigger": {
    "type": "condition",
    "condition": {
      "metric": "traffic_volume",
      "operator": ">",
      "value": 1000,
      "timeframe": "1hour"
    }
  },
  "actions": [
    {
      "type": "send_email",
      "email": {
        "to": ["admin@example.com"],
        "subject": "High Traffic Alert",
        "template": "Traffic volume: {{traffic_volume}}"
      }
    }
  ]
}

# 手动执行规则
POST /api/automation-rules/:id/execute

# 获取执行历史
GET /api/automation-rules/:id/executions
```

## 🔧 故障排除

### 常见问题

1. **MongoDB连接失败**
   - 检查MongoDB服务状态
   - 验证连接字符串配置
   - 确认网络连接

2. **A/B测试不生效**
   - 检查测试状态是否为"running"
   - 验证变体页面是否存在
   - 检查中间件是否正确配置

3. **自动化规则不执行**
   - 检查自动化引擎状态
   - 验证触发条件配置
   - 查看执行日志

4. **Cloak检测不准确**
   - 更新IP黑名单
   - 调整检测敏感度
   - 检查自定义规则

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 查看自动化日志
tail -f logs/automation.log
```

## 🤝 贡献指南

### 开发流程

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/new-feature`)
3. 提交更改 (`git commit -am 'Add new feature'`)
4. 推送到分支 (`git push origin feature/new-feature`)
5. 创建Pull Request

### 代码规范

- 使用ESLint进行代码检查
- 遵循Prettier格式化规范
- 编写单元测试
- 更新相关文档

### 测试

```bash
# 运行测试
npm test

# 运行测试覆盖率
npm run test:coverage
```

## � 许可证

本项目基于MIT许可证开源 - 查看[LICENSE](LICENSE)文件了解详情。

## 🆘 技术支持

- **文档**: [Wiki](https://github.com/your-repo/facebook-ads-system/wiki)
- **问题反馈**: [Issues](https://github.com/your-repo/facebook-ads-system/issues)
- **讨论**: [Discussions](https://github.com/your-repo/facebook-ads-system/discussions)
- **邮件**: support@example.com

## 🏆 致谢

感谢以下开源项目的支持：

- [React](https://reactjs.org/) - 前端框架
- [Node.js](https://nodejs.org/) - 后端运行时
- [MongoDB](https://www.mongodb.com/) - 数据库
- [Express](https://expressjs.com/) - Web框架
- [Ant Design](https://ant.design/) - UI组件库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器

---

**版本**: 3.0.0 | **更新时间**: 2024-01-20 | **作者**: Landing Page System Team
