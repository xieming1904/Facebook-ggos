# Facebook广告落地页管理系统

一个集成Facebook广告审核屏蔽功能（Cloak）的专业落地页管理系统，支持域名管理、页面编辑、访问统计等功能。

## 🚀 功能特性

### 核心功能
- **Facebook广告审核屏蔽（Cloak）**
  - 智能识别Facebook爬虫和审核机器人
  - 基于IP地址、User-Agent、地理位置的多重检测
  - 自动显示掩护页面给审核系统，真实页面给用户
  - 支持白名单/黑名单管理

- **域名管理**
  - 支持多域名管理
  - SSL证书配置
  - 域名状态监控
  - 自动健康检查

- **落地页管理**
  - 可视化页面编辑器
  - 多种模板选择（新闻、博客、电商、企业）
  - 实时预览功能
  - SEO优化设置

- **数据分析**
  - 实时访问统计
  - 转化率分析
  - 地理位置分析
  - 设备类型统计

- **用户管理**
  - 多用户支持
  - 角色权限管理
  - 操作日志记录

## 🛠️ 技术栈

### 后端
- **Node.js** - 服务器运行环境
- **Express.js** - Web应用框架
- **MongoDB** - 数据库
- **JWT** - 身份认证
- **Mongoose** - MongoDB对象模型

### 前端
- **React** - 用户界面框架
- **Ant Design** - UI组件库
- **Recharts** - 图表库
- **Monaco Editor** - 代码编辑器

### 基础设施
- **Docker** - 容器化部署
- **Nginx** - 反向代理和负载均衡
- **Redis** - 缓存系统
- **SSL/TLS** - 安全传输

## 📦 快速开始

### 系统要求
- Linux/macOS 操作系统
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (可选，用于开发)

### 一键部署

1. **克隆项目**
   ```bash
   git clone https://github.com/your-repo/facebook-ad-landing-system.git
   cd facebook-ad-landing-system
   ```

2. **运行部署脚本**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **访问系统**
   - 管理界面: https://localhost
   - 默认账号: admin / admin123

### 手动部署

1. **安装依赖**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **构建前端**
   ```bash
   cd client && npm run build && cd ..
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

## 🔧 配置说明

### 环境变量
创建 `.env` 文件并配置以下变量：

```env
# 应用配置
NODE_ENV=production
PORT=5000

# 数据库配置
MONGODB_URI=mongodb://admin:password123@mongodb:27017/facebook_ads?authSource=admin

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key

# Redis配置
REDIS_URL=redis://redis:6379

# 日志级别
LOG_LEVEL=info
```

### Nginx配置
- 配置文件: `nginx.conf`
- SSL证书: `ssl/cert.pem` 和 `ssl/key.pem`
- 支持HTTP/2和现代SSL协议

### Docker配置
- 服务编排: `docker-compose.yml`
- 容器镜像: `Dockerfile`
- 数据持久化: Docker volumes

## 📖 使用指南

### 1. 域名管理
- 添加域名并配置SSL
- 设置主页面和掩护页面
- 启用Cloak功能

### 2. 创建落地页
- 选择模板或自定义设计
- 编辑HTML/CSS/JavaScript
- 配置SEO信息
- 实时预览效果

### 3. Cloak设置
- 配置检测规则
- 管理白名单/黑名单
- 查看访问日志
- 分析拦截效果

### 4. 数据分析
- 查看访问统计
- 分析转化率
- 导出数据报告

## 🔐 安全特性

### 访问控制
- JWT身份认证
- 角色权限管理
- API访问限制

### 网络安全
- HTTPS强制加密
- 安全头部设置
- CSRF保护
- XSS防护

### 隐私保护
- 访问日志脱敏
- 数据加密存储
- 定期安全审计

## 📊 监控指标

### 系统监控
- 服务健康状态
- 资源使用情况
- 错误日志记录

### 业务指标
- 访问量统计
- 转化率分析
- Cloak效果评估

## 🚢 部署架构

```
Internet
    ↓
[Nginx Proxy]
    ↓
[Node.js Backend] ← → [MongoDB]
    ↑                     ↑
[React Frontend]    [Redis Cache]
```

## 📝 API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取用户信息

### 域名管理
- `GET /api/domains` - 获取域名列表
- `POST /api/domains` - 创建域名
- `PUT /api/domains/:id` - 更新域名
- `DELETE /api/domains/:id` - 删除域名

### 落地页管理
- `GET /api/landing-pages` - 获取页面列表
- `POST /api/landing-pages` - 创建页面
- `PUT /api/landing-pages/:id` - 更新页面
- `DELETE /api/landing-pages/:id` - 删除页面

### Cloak功能
- `GET /api/cloak/settings` - 获取Cloak设置
- `POST /api/cloak/test-ip` - 测试IP地址
- `GET /api/cloak/logs` - 获取访问日志

## 🔍 故障排除

### 常见问题

1. **端口占用**
   ```bash
   # 检查端口占用
   netstat -tuln | grep :80
   # 停止占用进程
   sudo pkill -f nginx
   ```

2. **MongoDB连接失败**
   ```bash
   # 检查MongoDB状态
   docker-compose logs mongodb
   # 重启MongoDB
   docker-compose restart mongodb
   ```

3. **SSL证书问题**
   ```bash
   # 重新生成证书
   rm -rf ssl/*
   ./deploy.sh
   ```

### 日志查看
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f nginx
```

## 📈 性能优化

### 缓存策略
- Redis缓存热点数据
- Nginx静态资源缓存
- CDN加速(可选)

### 数据库优化
- MongoDB索引优化
- 查询性能调优
- 连接池配置

## 🤝 开发指南

### 开发环境
```bash
# 启动开发服务器
npm run dev

# 启动前端开发服务器
cd client && npm start
```

### 代码规范
- ESLint代码检查
- Prettier代码格式化
- Git提交规范

### 测试
```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🆘 支持与反馈

如果您遇到问题或有建议，请通过以下方式联系我们：

- 创建 Issue
- 发送邮件至 support@example.com
- 查看文档: https://docs.example.com

## 🔄 更新日志

### v1.0.0 (2024-01-20)
- 初始版本发布
- 完整的Cloak功能
- 域名和落地页管理
- 用户权限系统
- 数据分析功能

---

**注意**: 请在生产环境中修改默认密码和JWT密钥，并配置正式的SSL证书。
