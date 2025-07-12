#!/bin/bash

# Facebook广告落地页管理系统 v3.0 - 部署验证脚本
# 此脚本用于验证系统是否正确部署并运行

echo "==========================================="
echo "Facebook广告落地页管理系统 v3.0 部署验证"
echo "==========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
}

# 错误计数
ERROR_COUNT=0

echo -e "${BLUE}正在检查系统依赖...${NC}"

# 检查Node.js版本
echo -n "检查Node.js版本... "
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
if [ -n "$NODE_VERSION" ]; then
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
    if [ "$MAJOR_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✓ Node.js $NODE_VERSION (满足要求 >= 18.0)${NC}"
    else
        echo -e "${RED}✗ Node.js $NODE_VERSION (需要 >= 18.0)${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
else
    echo -e "${RED}✗ Node.js 未安装${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 检查npm
echo -n "检查npm... "
npm --version > /dev/null 2>&1
check_status "npm 已安装"

# 检查MongoDB
echo -n "检查MongoDB... "
mongod --version > /dev/null 2>&1
check_status "MongoDB 已安装"

# 检查MongoDB服务状态
echo -n "检查MongoDB服务状态... "
if systemctl is-active --quiet mongod || pgrep mongod > /dev/null; then
    echo -e "${GREEN}✓ MongoDB 服务运行中${NC}"
else
    echo -e "${RED}✗ MongoDB 服务未运行${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 检查Nginx
echo -n "检查Nginx... "
nginx -v > /dev/null 2>&1
check_status "Nginx 已安装"

# 检查PM2
echo -n "检查PM2... "
pm2 --version > /dev/null 2>&1
check_status "PM2 已安装"

echo ""
echo -e "${BLUE}正在检查项目文件...${NC}"

# 检查项目目录
echo -n "检查项目目录... "
[ -d "src" ] && [ -d "client" ]
check_status "项目目录结构正确"

# 检查package.json
echo -n "检查package.json... "
[ -f "package.json" ] && [ -f "client/package.json" ]
check_status "package.json 文件存在"

# 检查环境配置
echo -n "检查环境配置... "
[ -f ".env" ]
check_status ".env 文件存在"

# 检查关键文件
echo -n "检查服务器文件... "
[ -f "src/server.js" ]
check_status "server.js 存在"

echo -n "检查新增模型文件... "
[ -f "src/models/ABTest.js" ] && [ -f "src/models/AutomationRule.js" ]
check_status "A/B测试和自动化规则模型文件存在"

echo -n "检查新增路由文件... "
[ -f "src/routes/abTests.js" ] && [ -f "src/routes/automationRules.js" ]
check_status "新增路由文件存在"

echo -n "检查中间件文件... "
[ -f "src/middleware/abTestMiddleware.js" ] && [ -f "src/utils/automationEngine.js" ]
check_status "A/B测试中间件和自动化引擎文件存在"

echo -n "检查前端页面... "
[ -f "client/src/pages/ABTests.js" ]
check_status "A/B测试前端页面存在"

echo ""
echo -e "${BLUE}正在检查依赖安装...${NC}"

# 检查后端依赖
echo -n "检查后端依赖... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ 后端依赖已安装${NC}"
else
    echo -e "${RED}✗ 后端依赖未安装${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 检查前端依赖
echo -n "检查前端依赖... "
if [ -d "client/node_modules" ]; then
    echo -e "${GREEN}✓ 前端依赖已安装${NC}"
else
    echo -e "${RED}✗ 前端依赖未安装${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 检查新增依赖
echo -n "检查新增依赖... "
if npm list node-cron nodemailer @slack/web-api mongoose-paginate-v2 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 新增依赖已安装${NC}"
else
    echo -e "${YELLOW}⚠ 部分新增依赖可能未安装${NC}"
fi

echo ""
echo -e "${BLUE}正在检查前端构建...${NC}"

# 检查前端构建
echo -n "检查前端构建文件... "
if [ -d "client/build" ]; then
    echo -e "${GREEN}✓ 前端已构建${NC}"
else
    echo -e "${YELLOW}⚠ 前端未构建，将尝试构建...${NC}"
    cd client
    npm run build
    cd ..
    if [ -d "client/build" ]; then
        echo -e "${GREEN}✓ 前端构建成功${NC}"
    else
        echo -e "${RED}✗ 前端构建失败${NC}"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
fi

echo ""
echo -e "${BLUE}正在检查服务状态...${NC}"

# 检查应用进程
echo -n "检查应用进程... "
if pm2 list | grep -q "facebook-ads-system" 2>/dev/null; then
    echo -e "${GREEN}✓ 应用进程运行中${NC}"
elif pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✓ 应用进程运行中 (直接运行)${NC}"
else
    echo -e "${YELLOW}⚠ 应用进程未运行${NC}"
fi

# 检查端口占用
echo -n "检查端口占用... "
PORT=${PORT:-5000}
if netstat -tuln | grep -q ":$PORT "; then
    echo -e "${GREEN}✓ 端口 $PORT 被占用 (应用可能在运行)${NC}"
else
    echo -e "${YELLOW}⚠ 端口 $PORT 未被占用${NC}"
fi

echo ""
echo -e "${BLUE}正在测试API连接...${NC}"

# 测试API连接
echo -n "测试健康检查API... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health | grep -q "200"; then
    echo -e "${GREEN}✓ API 健康检查正常${NC}"
else
    echo -e "${RED}✗ API 健康检查失败${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""
echo -e "${BLUE}正在检查数据库连接...${NC}"

# 检查数据库连接
echo -n "测试数据库连接... "
if mongo --eval "db.runCommand('ping').ok" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接正常${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""
echo -e "${BLUE}正在检查新功能...${NC}"

# 检查A/B测试API
echo -n "测试A/B测试API... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/ab-tests | grep -q "401\|200"; then
    echo -e "${GREEN}✓ A/B测试API 响应正常${NC}"
else
    echo -e "${RED}✗ A/B测试API 无响应${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

# 检查自动化规则API
echo -n "测试自动化规则API... "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/automation-rules | grep -q "401\|200"; then
    echo -e "${GREEN}✓ 自动化规则API 响应正常${NC}"
else
    echo -e "${RED}✗ 自动化规则API 无响应${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""
echo -e "${BLUE}正在检查日志文件...${NC}"

# 检查日志目录
echo -n "检查日志目录... "
[ -d "logs" ]
check_status "日志目录存在"

# 检查日志文件
echo -n "检查日志文件... "
if ls logs/*.log > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 日志文件存在${NC}"
else
    echo -e "${YELLOW}⚠ 日志文件不存在或为空${NC}"
fi

echo ""
echo -e "${BLUE}正在检查权限...${NC}"

# 检查文件权限
echo -n "检查上传目录权限... "
if [ -d "uploads" ] && [ -w "uploads" ]; then
    echo -e "${GREEN}✓ 上传目录权限正常${NC}"
else
    echo -e "${RED}✗ 上传目录权限不足${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo -n "检查日志目录权限... "
if [ -d "logs" ] && [ -w "logs" ]; then
    echo -e "${GREEN}✓ 日志目录权限正常${NC}"
else
    echo -e "${RED}✗ 日志目录权限不足${NC}"
    ERROR_COUNT=$((ERROR_COUNT + 1))
fi

echo ""
echo "==========================================="
echo "验证完成"
echo "==========================================="

if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过！系统已成功部署。${NC}"
    echo ""
    echo -e "${BLUE}访问地址:${NC}"
    echo "  - 前端: http://localhost:$PORT"
    echo "  - API: http://localhost:$PORT/api"
    echo "  - 健康检查: http://localhost:$PORT/api/health"
    echo ""
    echo -e "${BLUE}新功能:${NC}"
    echo "  - A/B测试: http://localhost:$PORT/ab-tests"
    echo "  - 自动化规则: http://localhost:$PORT/automation-rules"
    echo ""
    echo -e "${BLUE}默认登录信息:${NC}"
    echo "  - 用户名: admin"
    echo "  - 密码: admin123"
    echo ""
else
    echo -e "${RED}❌ 发现 $ERROR_COUNT 个问题，请检查并解决。${NC}"
    echo ""
    echo -e "${YELLOW}常见解决方案:${NC}"
    echo "1. 安装缺失的依赖: npm install && cd client && npm install"
    echo "2. 启动MongoDB服务: systemctl start mongod"
    echo "3. 构建前端: npm run build"
    echo "4. 启动应用: npm start"
    echo "5. 检查环境配置: 确保.env文件配置正确"
    echo ""
fi

echo ""
echo -e "${BLUE}系统信息:${NC}"
echo "  - 版本: v3.0.0"
echo "  - Node.js: $(node --version 2>/dev/null || echo '未安装')"
echo "  - MongoDB: $(mongod --version 2>/dev/null | head -1 || echo '未安装')"
echo "  - 系统: $(uname -s) $(uname -r)"
echo ""

echo -e "${BLUE}支持信息:${NC}"
echo "  - 文档: https://github.com/your-repo/facebook-ads-system"
echo "  - 问题反馈: https://github.com/your-repo/facebook-ads-system/issues"
echo "  - 邮件支持: support@example.com"
echo ""

exit $ERROR_COUNT