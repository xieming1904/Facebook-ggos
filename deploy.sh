#!/bin/bash

# Facebook广告落地页管理系统一键部署脚本
# 作者: Landing Page System
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        exit 1
    fi
}

# 检查系统要求
check_requirements() {
    log_info "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "操作系统: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "操作系统: macOS"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    log_success "Docker已安装: $(docker --version)"
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    log_success "Docker Compose已安装: $(docker-compose --version)"
    
    # 检查端口占用
    if netstat -tuln | grep -q ":80 "; then
        log_warning "端口80已被占用，可能会影响部署"
    fi
    
    if netstat -tuln | grep -q ":443 "; then
        log_warning "端口443已被占用，可能会影响部署"
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p uploads/screenshots
    mkdir -p logs
    mkdir -p ssl
    
    log_success "目录创建完成"
}

# 生成SSL证书
generate_ssl_cert() {
    log_info "生成SSL证书..."
    
    if [[ ! -f ssl/cert.pem ]] || [[ ! -f ssl/key.pem ]]; then
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=Facebook Ads System/OU=IT Department/CN=localhost"
        log_success "SSL证书生成完成"
    else
        log_info "SSL证书已存在，跳过生成"
    fi
}

# 创建MongoDB初始化脚本
create_mongo_init() {
    log_info "创建MongoDB初始化脚本..."
    
    cat > mongo-init.js << 'EOF'
db = db.getSiblingDB('facebook_ads');

// 创建管理员用户
db.users.insertOne({
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$10$rKmz.DGWYQNxCfRRxjkJ8uPxXKDNJiHaZrjpnSCh6yBhWJxqCbGR6', // admin123
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    lastLogin: null
});

// 创建示例落地页
db.landingpages.insertOne({
    name: '示例新闻页面',
    type: 'cloak',
    content: {
        html: '<div class="news-container"><h1>最新新闻</h1><p>这是一个示例新闻页面，用于Facebook广告审核。</p></div>',
        css: '.news-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }',
        js: 'console.log("News page loaded");'
    },
    seo: {
        title: '最新新闻 - 今日头条',
        description: '获取最新的新闻资讯和实时更新',
        keywords: '新闻,资讯,头条'
    },
    template: 'news',
    isActive: true,
    analytics: {
        views: 0,
        uniqueViews: 0,
        clicks: 0,
        conversions: 0
    },
    createdBy: db.users.findOne({username: 'admin'})._id,
    createdAt: new Date(),
    updatedAt: new Date()
});

print('MongoDB初始化完成');
EOF

    log_success "MongoDB初始化脚本创建完成"
}

# 创建环境变量文件
create_env_file() {
    log_info "创建环境变量文件..."
    
    if [[ ! -f .env ]]; then
        cat > .env << EOF
# 应用配置
NODE_ENV=production
PORT=5000

# 数据库配置
MONGODB_URI=mongodb://admin:password123@mongodb:27017/facebook_ads?authSource=admin

# JWT密钥 (请在生产环境中更改)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-$(date +%s)

# 其他配置
REDIS_URL=redis://redis:6379
LOG_LEVEL=info
EOF
        log_success "环境变量文件创建完成"
    else
        log_info "环境变量文件已存在，跳过创建"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装后端依赖..."
    npm install
    
    log_info "安装前端依赖..."
    cd client
    npm install
    cd ..
    
    log_success "依赖安装完成"
}

# 构建前端应用
build_frontend() {
    log_info "构建前端应用..."
    cd client
    npm run build
    cd ..
    log_success "前端构建完成"
}

# 启动服务
start_services() {
    log_info "启动Docker服务..."
    
    # 停止可能正在运行的容器
    docker-compose down
    
    # 构建和启动服务
    docker-compose up -d --build
    
    log_success "服务启动完成"
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."
    
    # 等待MongoDB启动
    for i in {1..30}; do
        if docker-compose exec mongodb mongo --eval "db.runCommand('ping').ok" &> /dev/null; then
            break
        fi
        sleep 2
    done
    
    # 等待后端服务启动
    for i in {1..30}; do
        if curl -f http://localhost:5000/api/health &> /dev/null; then
            break
        fi
        sleep 2
    done
    
    log_success "服务启动完成"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "==================== 部署信息 ===================="
    echo "应用地址: https://localhost"
    echo "API地址: https://localhost/api"
    echo "管理员账号: admin"
    echo "管理员密码: admin123"
    echo ""
    echo "==================== 服务状态 ===================="
    docker-compose ps
    echo ""
    echo "==================== 有用命令 ===================="
    echo "查看日志: docker-compose logs -f"
    echo "重启服务: docker-compose restart"
    echo "停止服务: docker-compose down"
    echo "更新服务: docker-compose up -d --build"
    echo ""
    echo "==================== 注意事项 ===================="
    echo "1. 请修改默认密码和JWT密钥"
    echo "2. 配置域名DNS解析"
    echo "3. 申请正式SSL证书"
    echo "4. 定期备份数据库"
    echo "================================================="
}

# 主函数
main() {
    log_info "开始部署Facebook广告落地页管理系统..."
    
    check_root
    check_requirements
    create_directories
    generate_ssl_cert
    create_mongo_init
    create_env_file
    install_dependencies
    build_frontend
    start_services
    wait_for_services
    show_deployment_info
    
    log_success "部署完成！"
}

# 错误处理
trap 'log_error "部署失败！请检查错误信息并重试。"' ERR

# 运行主函数
main "$@"