#!/bin/bash

# Facebook广告落地页管理系统 - 部署脚本
# 版本: 2.0 (完善版)
# 作者: Landing Page System Team

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        warn "建议使用root用户运行此脚本以避免权限问题"
        read -p "是否继续？(y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统要求
check_requirements() {
    info "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log "系统: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log "系统: MacOS"
    else
        error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    # 检查必要的命令
    local required_commands=("curl" "git" "unzip")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            error "缺少必要的命令: $cmd"
            exit 1
        fi
    done
    
    log "系统要求检查完成"
}

# 安装 Node.js
install_nodejs() {
    if command -v node &> /dev/null; then
        local node_version=$(node -v)
        log "Node.js 已安装: $node_version"
        
        # 检查版本是否符合要求 (>=16.0.0)
        local version_number=$(echo $node_version | sed 's/v//' | cut -d. -f1)
        if [ "$version_number" -lt 16 ]; then
            warn "Node.js 版本过低 ($node_version)，建议升级到 16.0.0 或更高版本"
        fi
        return 0
    fi
    
    info "安装 Node.js 18.x..."
    
    # 安装 Node.js 18.x
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install node@18
        else
            error "macOS 上需要 Homebrew 来安装 Node.js"
            exit 1
        fi
    fi
    
    log "Node.js 安装完成: $(node -v)"
}

# 安装 MongoDB
install_mongodb() {
    if command -v mongod &> /dev/null; then
        log "MongoDB 已安装"
        return 0
    fi
    
    info "安装 MongoDB..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
            sudo apt-get update
            sudo apt-get install -y mongodb-org
            sudo systemctl start mongod
            sudo systemctl enable mongod
        # CentOS/RHEL
        elif command -v yum &> /dev/null; then
            cat <<EOF | sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF
            sudo yum install -y mongodb-org
            sudo systemctl start mongod
            sudo systemctl enable mongod
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew tap mongodb/brew
            brew install mongodb-community
            brew services start mongodb-community
        else
            error "macOS 上需要 Homebrew 来安装 MongoDB"
            exit 1
        fi
    fi
    
    log "MongoDB 安装完成"
}

# 安装 Docker 和 Docker Compose
install_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        log "Docker 和 Docker Compose 已安装"
        return 0
    fi
    
    info "安装 Docker 和 Docker Compose..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # 安装 Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        
        # 安装 Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # 启动 Docker
        sudo systemctl start docker
        sudo systemctl enable docker
        
        rm get-docker.sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        warn "请手动安装 Docker Desktop for Mac"
        open "https://www.docker.com/products/docker-desktop"
        read -p "安装完成后按 Enter 继续..."
    fi
    
    log "Docker 安装完成"
}

# 安装 Nginx
install_nginx() {
    if command -v nginx &> /dev/null; then
        log "Nginx 已安装"
        return 0
    fi
    
    info "安装 Nginx..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y nginx
        fi
        
        sudo systemctl start nginx
        sudo systemctl enable nginx
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install nginx
            brew services start nginx
        fi
    fi
    
    log "Nginx 安装完成"
}

# 配置防火墙
configure_firewall() {
    info "配置防火墙..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow 3000/tcp
        sudo ufw allow 5000/tcp
        sudo ufw --force enable
        log "UFW 防火墙配置完成"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=22/tcp
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --permanent --add-port=3000/tcp
        sudo firewall-cmd --permanent --add-port=5000/tcp
        sudo firewall-cmd --reload
        log "Firewalld 防火墙配置完成"
    else
        warn "未找到防火墙管理工具，请手动配置防火墙"
    fi
}

# 创建必要的目录
create_directories() {
    info "创建必要的目录..."
    
    local directories=(
        "logs"
        "uploads"
        "backups"
        "ssl"
        "config"
        "tmp"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "创建目录: $dir"
        fi
    done
    
    # 设置权限
    chmod 755 logs uploads backups ssl config tmp
    log "目录创建完成"
}

# 安装项目依赖
install_dependencies() {
    info "安装项目依赖..."
    
    # 安装后端依赖
    if [ -f "package.json" ]; then
        log "安装后端依赖..."
        npm install
    fi
    
    # 安装前端依赖
    if [ -d "client" ] && [ -f "client/package.json" ]; then
        log "安装前端依赖..."
        cd client
        npm install
        cd ..
    fi
    
    log "依赖安装完成"
}

# 生成环境配置文件
generate_env_config() {
    info "生成环境配置文件..."
    
    if [ -f ".env" ]; then
        warn ".env 文件已存在，跳过生成"
        return 0
    fi
    
    # 生成随机密钥
    local jwt_secret=$(openssl rand -base64 32)
    local session_secret=$(openssl rand -base64 32)
    
    cat > .env << EOF
# 应用配置
NODE_ENV=production
PORT=5000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/facebook-ads

# JWT 配置
JWT_SECRET=${jwt_secret}
JWT_EXPIRE=7d

# 会话配置
SESSION_SECRET=${session_secret}

# 上传配置
UPLOAD_MAX_SIZE=10485760

# 日志配置
LOG_LEVEL=info

# 邮件配置 (可选)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# SSL 配置
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem

# 其他配置
ADMIN_EMAIL=admin@example.com
BACKUP_RETENTION_DAYS=30
EOF
    
    log "环境配置文件生成完成"
}

# 生成 SSL 证书
generate_ssl_cert() {
    info "生成 SSL 证书..."
    
    if [ -f "ssl/cert.pem" ] && [ -f "ssl/key.pem" ]; then
        warn "SSL 证书已存在，跳过生成"
        return 0
    fi
    
    # 生成自签名证书
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=CN/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
    
    log "SSL 证书生成完成"
}

# 配置 Nginx
configure_nginx() {
    info "配置 Nginx..."
    
    local nginx_config="/etc/nginx/sites-available/facebook-ads"
    local nginx_enabled="/etc/nginx/sites-enabled/facebook-ads"
    
    # 创建 Nginx 配置
    cat > nginx.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name localhost;
    
    # 重定向到 HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost;
    
    # SSL 配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 代理到 Node.js 应用
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # 静态文件
    location /static {
        alias /path/to/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 上传文件
    location /uploads {
        alias /path/to/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # 限制文件上传大小
    client_max_body_size 100M;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF
    
    # 替换路径
    local current_path=$(pwd)
    sed -i "s|/path/to/ssl|${current_path}/ssl|g" nginx.conf
    sed -i "s|/path/to/static|${current_path}/client/build/static|g" nginx.conf
    sed -i "s|/path/to/uploads|${current_path}/uploads|g" nginx.conf
    
    log "Nginx 配置生成完成"
}

# 构建前端
build_frontend() {
    info "构建前端应用..."
    
    if [ -d "client" ]; then
        cd client
        npm run build
        cd ..
        log "前端构建完成"
    else
        warn "未找到前端目录，跳过构建"
    fi
}

# 初始化数据库
init_database() {
    info "初始化数据库..."
    
    # 等待 MongoDB 启动
    sleep 5
    
    # 创建默认管理员用户
    node -e "
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    
    mongoose.connect('mongodb://localhost:27017/facebook-ads', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    
    const userSchema = new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        role: String,
        isActive: Boolean,
        createdAt: { type: Date, default: Date.now }
    });
    
    const User = mongoose.model('User', userSchema);
    
    async function createAdmin() {
        try {
            const existingAdmin = await User.findOne({ username: 'admin' });
            if (existingAdmin) {
                console.log('管理员用户已存在');
                process.exit(0);
            }
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                username: 'admin',
                email: 'admin@example.com',
                password: hashedPassword,
                role: 'admin',
                isActive: true
            });
            
            await admin.save();
            console.log('默认管理员用户创建成功');
            console.log('用户名: admin');
            console.log('密码: admin123');
            process.exit(0);
        } catch (error) {
            console.error('创建管理员用户失败:', error);
            process.exit(1);
        }
    }
    
    createAdmin();
    " 2>/dev/null || warn "数据库初始化失败，请手动创建管理员用户"
    
    log "数据库初始化完成"
}

# 创建系统服务
create_systemd_service() {
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        warn "跳过系统服务创建（仅支持 Linux）"
        return 0
    fi
    
    info "创建系统服务..."
    
    local service_file="/etc/systemd/system/facebook-ads.service"
    local current_path=$(pwd)
    
    cat > facebook-ads.service << EOF
[Unit]
Description=Facebook Ads Landing Page System
After=network.target mongodb.service
Requires=mongodb.service

[Service]
Type=simple
User=root
WorkingDirectory=${current_path}
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    log "系统服务配置文件生成完成"
}

# 启动服务
start_services() {
    info "启动服务..."
    
    # 启动 MongoDB
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start mongod
        sudo systemctl enable mongod
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community
    fi
    
    # 启动 Nginx
    if command -v nginx &> /dev/null; then
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo systemctl start nginx
            sudo systemctl enable nginx
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start nginx
        fi
    fi
    
    log "服务启动完成"
}

# 运行测试
run_tests() {
    info "运行测试..."
    
    # 测试 MongoDB 连接
    if command -v mongosh &> /dev/null; then
        mongosh --eval "db.runCommand('ping')" facebook-ads >/dev/null 2>&1 && log "MongoDB 连接正常" || warn "MongoDB 连接失败"
    fi
    
    # 测试 Node.js 应用
    if [ -f "src/server.js" ]; then
        timeout 10 node src/server.js >/dev/null 2>&1 && log "Node.js 应用启动正常" || warn "Node.js 应用启动失败"
    fi
    
    log "测试完成"
}

# 显示部署信息
show_deployment_info() {
    echo
    echo "======================================"
    echo "Facebook广告落地页管理系统部署完成！"
    echo "======================================"
    echo
    echo "📋 部署信息："
    echo "   • 应用端口: 5000"
    echo "   • 数据库: MongoDB (27017)"
    echo "   • 反向代理: Nginx (80/443)"
    echo "   • 日志目录: ./logs"
    echo "   • 上传目录: ./uploads"
    echo "   • 备份目录: ./backups"
    echo
    echo "🔐 默认管理员账户："
    echo "   • 用户名: admin"
    echo "   • 密码: admin123"
    echo "   • 请立即修改默认密码！"
    echo
    echo "🌐 访问地址："
    echo "   • HTTP: http://localhost"
    echo "   • HTTPS: https://localhost"
    echo
    echo "🛠️ 管理命令："
    echo "   • 启动应用: npm start"
    echo "   • 开发模式: npm run dev"
    echo "   • 构建前端: npm run build"
    echo "   • 查看日志: tail -f logs/combined.log"
    echo
    echo "📚 更多信息请查看 README.md"
    echo "======================================"
}

# 清理临时文件
cleanup() {
    info "清理临时文件..."
    
    # 清理可能的临时文件
    rm -f get-docker.sh
    rm -f mongodb.tgz
    
    log "清理完成"
}

# 主函数
main() {
    log "开始部署 Facebook广告落地页管理系统..."
    
    # 检查环境
    check_root
    check_requirements
    
    # 安装依赖
    install_nodejs
    install_mongodb
    install_nginx
    
    # 可选：安装 Docker
    read -p "是否安装 Docker? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_docker
    fi
    
    # 配置系统
    configure_firewall
    create_directories
    generate_env_config
    generate_ssl_cert
    
    # 安装和构建应用
    install_dependencies
    build_frontend
    
    # 配置服务
    configure_nginx
    create_systemd_service
    
    # 初始化数据库
    init_database
    
    # 启动服务
    start_services
    
    # 运行测试
    run_tests
    
    # 清理
    cleanup
    
    # 显示部署信息
    show_deployment_info
    
    log "部署完成！"
}

# 错误处理
trap 'error "部署过程中出现错误，请检查日志"; exit 1' ERR

# 运行主函数
main "$@"