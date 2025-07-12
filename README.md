# Facebook广告落地页管理系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)

> 专业的Facebook广告落地页管理系统，集成Facebook广告审核屏蔽功能（Cloak）和域名管理功能

## 🎯 核心功能

### 📊 仪表盘
- **实时统计**: 访问量、转化率、收入等关键指标
- **图表分析**: 流量趋势、设备分布、地域分析
- **快速操作**: 一键创建页面、查看日志、系统状态

### 🌐 域名管理
- **多域名支持**: 管理多个域名的落地页
- **SSL证书**: 自动化SSL证书管理
- **健康检查**: 定期监控域名状态
- **DNS配置**: 域名解析管理

### 📄 落地页管理
- **可视化编辑器**: 集成Monaco Editor的代码编辑器
- **模板系统**: 预置新闻、博客、企业等多种模板
- **实时预览**: 支持桌面、平板、手机多设备预览
- **SEO优化**: 完整的SEO设置和优化建议
- **版本控制**: 页面版本管理和回滚

### 🛡️ Cloak功能（核心）
- **智能检测**: 多维度Facebook爬虫检测
  - IP地址范围检测
  - User-Agent模式匹配
  - 地理位置分析
  - 代理服务器检测
  - HTTP头部分析
- **自动跳转**: 检测到Facebook爬虫时自动显示掩护页面
- **白名单/黑名单**: 灵活的访问控制
- **检测日志**: 详细的访问和检测日志
- **敏感度调节**: 可调节的检测敏感度

### 📈 数据分析
- **实时统计**: 访问量、点击率、转化率
- **访客分析**: 设备类型、浏览器、操作系统
- **地域分析**: 访客地理位置分布
- **转化漏斗**: 完整的转化路径分析
- **数据导出**: 支持CSV、Excel格式导出

### 👥 用户管理
- **角色权限**: 管理员、普通用户权限管理
- **活动日志**: 用户操作记录
- **登录安全**: 登录失败锁定、会话管理

### ⚙️ 系统设置
- **通用设置**: 站点信息、文件上传、通知设置
- **安全设置**: 密码策略、访问控制、限流设置
- **Cloak配置**: 检测规则、自定义配置
- **系统信息**: 服务器状态、性能监控
- **日志管理**: 系统日志查看、下载、清理
- **备份恢复**: 一键备份和恢复系统数据

## � 快速开始

### 一键部署

```bash
# 克隆项目
git clone https://github.com/your-username/facebook-ads-landing-system.git
cd facebook-ads-landing-system

# 一键部署
chmod +x deploy.sh
./deploy.sh
```

### 手动部署

#### 1. 环境要求
- Node.js 16.0+
- MongoDB 5.0+
- Nginx (可选)
- SSL证书 (生产环境)

#### 2. 安装依赖
```bash
# 后端依赖
npm install

# 前端依赖
cd client
npm install
cd ..
```

#### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

#### 4. 构建前端
```bash
cd client
npm run build
cd ..
```

#### 5. 启动服务
```bash
# 生产环境
npm start

# 开发环境
npm run dev
```

## 📁 项目结构

```
facebook-ads-landing-system/
├── client/                     # 前端应用
│   ├── public/                # 静态资源
│   ├── src/                   # 源代码
│   │   ├── components/        # 组件
│   │   ├── pages/            # 页面
│   │   ├── contexts/         # 上下文
│   │   ├── utils/            # 工具函数
│   │   └── App.js            # 主应用
│   ├── package.json          # 前端依赖
│   └── build/                # 构建输出
├── src/                       # 后端应用
│   ├── middleware/           # 中间件
│   │   ├── auth.js          # 认证中间件
│   │   ├── cloakMiddleware.js # Cloak中间件
│   │   └── loggerMiddleware.js # 日志中间件
│   ├── models/              # 数据模型
│   │   ├── User.js          # 用户模型
│   │   ├── Domain.js        # 域名模型
│   │   ├── LandingPage.js   # 落地页模型
│   │   └── Setting.js       # 设置模型
│   ├── routes/              # 路由
│   │   ├── auth.js          # 认证路由
│   │   ├── domains.js       # 域名管理
│   │   ├── landingPages.js  # 落地页管理
│   │   ├── cloak.js         # Cloak功能
│   │   ├── analytics.js     # 数据分析
│   │   ├── settings.js      # 系统设置
│   │   ├── system.js        # 系统管理
│   │   └── logs.js          # 日志管理
│   ├── utils/               # 工具函数
│   │   ├── logger.js        # 日志工具
│   │   └── helpers.js       # 辅助函数
│   └── server.js            # 主服务器
├── uploads/                  # 上传文件目录
├── logs/                     # 日志文件
├── backups/                  # 备份文件
├── ssl/                      # SSL证书
├── nginx.conf               # Nginx配置
├── docker-compose.yml       # Docker配置
├── deploy.sh               # 部署脚本
├── package.json            # 项目依赖
└── README.md               # 说明文档
```

## 🔧 配置说明

### 环境变量配置 (.env)

```env
# 应用配置
NODE_ENV=production
PORT=5000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/facebook-ads

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# 会话配置
SESSION_SECRET=your-session-secret

# 上传配置
UPLOAD_MAX_SIZE=10485760

# 日志配置
LOG_LEVEL=info

# 邮件配置 (可选)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# SSL 配置
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# 其他配置
ADMIN_EMAIL=admin@example.com
BACKUP_RETENTION_DAYS=30
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
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## �️ Cloak功能详解

### 检测机制

系统采用多维度检测机制来识别Facebook爬虫：

1. **IP地址检测**
   - Facebook官方IP段
   - 云服务提供商IP
   - 代理服务器IP
   - 可疑IP地址

2. **User-Agent检测**
   - Facebook爬虫特征
   - 浏览器指纹分析
   - 自动化工具检测

3. **HTTP头部分析**
   - Accept-Language
   - Accept-Encoding
   - 其他HTTP头部特征

4. **地理位置检测**
   - 异常地理位置
   - VPN/代理检测

5. **行为模式分析**
   - 访问频率
   - 页面停留时间
   - 交互行为

### 配置选项

```javascript
// Cloak配置示例
{
  "enableCloak": true,
  "detectionSensitivity": "medium", // low, medium, high
  "autoUpdateRules": true,
  "logRetention": 30,
  "blockUnknownBots": false,
  "customUserAgents": [
    "facebookexternalhit/1.1",
    "Facebot"
  ],
  "customIpRules": [
    "173.252.0.0/16",
    "204.15.20.0/22"
  ]
}
```

### 检测日志

系统会详细记录所有检测结果：

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "ip": "173.252.74.22",
  "userAgent": "facebookexternalhit/1.1",
  "result": "blocked",
  "reason": "facebook_crawler",
  "geolocation": {
    "country": "US",
    "city": "Menlo Park"
  },
  "headers": {
    "accept": "text/html,application/xhtml+xml",
    "accept-language": "en-US,en;q=0.9"
  }
}
```

## 📊 数据分析功能

### 实时统计

- **访问量**: 实时PV、UV统计
- **转化率**: 点击转化率分析
- **收入统计**: 广告收入跟踪
- **设备分析**: 设备类型分布

### 图表分析

- **趋势图**: 访问量时间趋势
- **饼图**: 设备、浏览器分布
- **地图**: 访客地理位置分布
- **漏斗图**: 转化路径分析

### 数据导出

支持多种格式的数据导出：
- CSV格式
- Excel格式
- JSON格式
- PDF报告

## 🔐 安全特性

### 认证授权

- **JWT认证**: 基于Token的无状态认证
- **角色权限**: 细粒度的权限控制
- **会话管理**: 安全的会话处理
- **密码策略**: 强密码要求

### 安全防护

- **HTTPS强制**: 强制HTTPS访问
- **CSRF保护**: 跨站请求伪造防护
- **XSS防护**: 跨站脚本攻击防护
- **SQL注入防护**: 参数化查询
- **限流保护**: API访问频率限制

### 日志审计

- **操作日志**: 详细的用户操作记录
- **访问日志**: 完整的访问日志
- **错误日志**: 系统错误记录
- **安全日志**: 安全事件记录

## � 性能优化

### 前端优化

- **代码分割**: 动态导入，按需加载
- **资源压缩**: JS、CSS、图片压缩
- **缓存策略**: 静态资源缓存
- **CDN加速**: 静态资源CDN分发

### 后端优化

- **数据库优化**: 索引优化，查询优化
- **缓存机制**: Redis缓存
- **负载均衡**: 多实例部署
- **资源池**: 数据库连接池

### 监控告警

- **性能监控**: 响应时间、吞吐量
- **错误监控**: 错误率、错误类型
- **资源监控**: CPU、内存、磁盘
- **告警机制**: 邮件、短信告警

## 📝 API文档

### 认证接口

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### 落地页管理

```http
GET /api/landing-pages
Authorization: Bearer <token>

POST /api/landing-pages
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新闻页面",
  "type": "cloak",
  "content": {
    "html": "<div>内容</div>",
    "css": "body { margin: 0; }",
    "js": "console.log('hello');"
  }
}
```

### Cloak检测

```http
GET /api/cloak/test
Authorization: Bearer <token>
X-Forwarded-For: 173.252.74.22
User-Agent: facebookexternalhit/1.1
```

## 🛠️ 开发指南

### 开发环境搭建

1. 克隆项目
2. 安装依赖
3. 配置环境变量
4. 启动开发服务器

### 代码规范

- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循React和Node.js最佳实践

### 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交代码
4. 创建Pull Request

## 📚 部署指南

### 开发环境部署

```bash
# 克隆项目
git clone <repository-url>
cd facebook-ads-landing-system

# 安装依赖
npm run install-all

# 启动开发服务器
npm run dev
```

### 生产环境部署

```bash
# 使用一键部署脚本
chmod +x deploy.sh
./deploy.sh
```

### Docker部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps
```

### 云服务器部署

1. **准备服务器**
   - Ubuntu 20.04+ 或 CentOS 7+
   - 2GB+ RAM
   - 20GB+ 存储空间

2. **安装依赖**
   ```bash
   # Ubuntu
   apt update && apt install -y curl git nodejs npm nginx mongodb
   
   # CentOS
   yum update && yum install -y curl git nodejs npm nginx mongodb
   ```

3. **配置服务**
   ```bash
   # 启动MongoDB
   systemctl start mongod
   systemctl enable mongod
   
   # 启动Nginx
   systemctl start nginx
   systemctl enable nginx
   ```

4. **部署应用**
   ```bash
   git clone <repository-url>
   cd facebook-ads-landing-system
   ./deploy.sh
   ```

## 🔧 故障排除

### 常见问题

1. **MongoDB连接失败**
   ```bash
   # 检查MongoDB状态
   systemctl status mongod
   
   # 重启MongoDB
   systemctl restart mongod
   ```

2. **端口占用**
   ```bash
   # 检查端口占用
   netstat -tuln | grep :5000
   
   # 杀死占用进程
   kill -9 <pid>
   ```

3. **SSL证书问题**
   ```bash
   # 重新生成证书
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout ssl/key.pem -out ssl/cert.pem
   ```

4. **权限问题**
   ```bash
   # 修改文件权限
   chmod -R 755 uploads/ logs/ backups/
   chown -R www-data:www-data uploads/ logs/ backups/
   ```

### 日志查看

```bash
# 应用日志
tail -f logs/combined.log

# 错误日志
tail -f logs/error.log

# 访问日志
tail -f logs/access.log

# 系统日志
journalctl -u facebook-ads -f
```

## 📈 监控和维护

### 性能监控

1. **系统资源监控**
   ```bash
   # CPU使用率
   top
   
   # 内存使用率
   free -h
   
   # 磁盘使用率
   df -h
   ```

2. **应用性能监控**
   ```bash
   # 查看进程状态
   pm2 status
   
   # 查看内存使用
   pm2 monit
   
   # 重启应用
   pm2 restart facebook-ads
   ```

### 数据备份

1. **自动备份**
   ```bash
   # 设置定时任务
   crontab -e
   
   # 每天2点备份
   0 2 * * * /path/to/backup.sh
   ```

2. **手动备份**
   ```bash
   # 数据库备份
   mongodump --db facebook-ads --out /backups/
   
   # 文件备份
   tar -czf backup.tar.gz uploads/ logs/ ssl/
   ```

### 安全维护

1. **定期更新**
   ```bash
   # 更新系统
   apt update && apt upgrade
   
   # 更新依赖
   npm update
   ```

2. **安全检查**
   ```bash
   # 检查漏洞
   npm audit
   
   # 修复漏洞
   npm audit fix
   ```

## 📞 技术支持

### 联系方式

- **GitHub**: [项目地址](https://github.com/your-username/facebook-ads-landing-system)
- **问题反馈**: 请在GitHub Issues中提交
- **邮件支持**: support@example.com

### 常用链接

- [在线文档](https://docs.example.com)
- [API文档](https://api.example.com/docs)
- [视频教程](https://www.youtube.com/playlist?list=xxx)
- [社区论坛](https://forum.example.com)

## � 许可证

本项目采用 MIT 许可证。详情请参见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户。

---

© 2024 Facebook广告落地页管理系统. 保留所有权利。
