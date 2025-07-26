#!/bin/bash

# 智能工作助手部署脚本
# Intelligent Work Assistant Deployment Script

set -euo pipefail

# ================================
# 配置变量
# ================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/intelligent-work-assistant"
BACKUP_DIR="/opt/intelligent-work-assistant/backups"
LOG_FILE="/var/log/iwa-deploy.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================================
# 工具函数
# ================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "此脚本需要 root 权限运行"
    fi
}

# 检查系统要求
check_requirements() {
    log "检查系统要求..."
    
    # 检查操作系统
    if [[ ! -f /etc/os-release ]]; then
        error "无法识别操作系统"
    fi
    
    source /etc/os-release
    log "操作系统: $NAME $VERSION"
    
    # 检查必要命令
    local commands=("docker" "docker-compose" "curl" "git" "openssl")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "缺少必要命令: $cmd"
        fi
    done
    
    # 检查 Docker 服务
    if ! systemctl is-active --quiet docker; then
        error "Docker 服务未运行"
    fi
    
    # 检查磁盘空间 (至少需要 10GB)
    local available_space=$(df / | tail -1 | awk '{print $4}')
    local required_space=$((10 * 1024 * 1024)) # 10GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        error "磁盘空间不足，至少需要 10GB 可用空间"
    fi
    
    log "系统要求检查通过"
}

# 创建部署目录结构
create_directories() {
    log "创建部署目录结构..."
    
    local directories=(
        "$DEPLOY_DIR"
        "$DEPLOY_DIR/data"
        "$DEPLOY_DIR/data/mongodb"
        "$DEPLOY_DIR/data/redis"
        "$DEPLOY_DIR/data/prometheus"
        "$DEPLOY_DIR/data/grafana"
        "$DEPLOY_DIR/data/elasticsearch"
        "$DEPLOY_DIR/config"
        "$DEPLOY_DIR/config/mongodb"
        "$DEPLOY_DIR/config/nginx"
        "$DEPLOY_DIR/logs"
        "$DEPLOY_DIR/logs/nginx"
        "$DEPLOY_DIR/logs/security"
        "$DEPLOY_DIR/logs/audit"
        "$DEPLOY_DIR/uploads"
        "$DEPLOY_DIR/uploads/temp"
        "$DEPLOY_DIR/uploads/documents"
        "$DEPLOY_DIR/uploads/audio"
        "$DEPLOY_DIR/uploads/images"
        "$DEPLOY_DIR/backups"
        "$DEPLOY_DIR/backups/mongodb"
        "$DEPLOY_DIR/backups/files"
        "$DEPLOY_DIR/quarantine"
        "$DEPLOY_DIR/ssl"
        "$DEPLOY_DIR/scripts"
        "$DEPLOY_DIR/monitoring"
        "$DEPLOY_DIR/logging"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log "创建目录: $dir"
    done
    
    # 设置目录权限
    chown -R 1001:1001 "$DEPLOY_DIR/uploads"
    chown -R 1001:1001 "$DEPLOY_DIR/logs"
    chmod -R 755 "$DEPLOY_DIR/uploads"
    chmod -R 750 "$DEPLOY_DIR/logs"
    chmod -R 700 "$DEPLOY_DIR/quarantine"
    chmod -R 700 "$DEPLOY_DIR/backups"
    
    log "目录结构创建完成"
}

# 复制项目文件
copy_project_files() {
    log "复制项目文件..."
    
    # 复制 Docker 配置
    cp "$PROJECT_ROOT/docker-compose.prod.yml" "$DEPLOY_DIR/"
    cp "$PROJECT_ROOT/Dockerfile.prod" "$DEPLOY_DIR/"
    
    # 复制配置文件
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        cp "$PROJECT_ROOT/.env.production" "$DEPLOY_DIR/"
    else
        warn ".env.production 文件不存在，请手动创建"
    fi
    
    # 复制脚本
    cp -r "$PROJECT_ROOT/scripts"/* "$DEPLOY_DIR/scripts/" 2>/dev/null || true
    
    # 复制监控配置
    cp -r "$PROJECT_ROOT/monitoring"/* "$DEPLOY_DIR/monitoring/" 2>/dev/null || true
    
    # 复制日志配置
    cp -r "$PROJECT_ROOT/logging"/* "$DEPLOY_DIR/logging/" 2>/dev/null || true
    
    log "项目文件复制完成"
}

# 生成 SSL 证书 (自签名证书用于测试)
generate_ssl_certificates() {
    log "生成 SSL 证书..."
    
    local ssl_dir="$DEPLOY_DIR/ssl"
    local domain="intelligent-assistant.local"
    
    if [[ ! -f "$ssl_dir/server.crt" ]]; then
        # 创建私钥
        openssl genrsa -out "$ssl_dir/server.key" 2048
        
        # 创建证书签名请求
        openssl req -new -key "$ssl_dir/server.key" -out "$ssl_dir/server.csr" -subj "/C=CN/ST=Beijing/L=Beijing/O=IWA/CN=$domain"
        
        # 创建自签名证书
        openssl x509 -req -days 365 -in "$ssl_dir/server.csr" -signkey "$ssl_dir/server.key" -out "$ssl_dir/server.crt"
        
        # 设置权限
        chmod 600 "$ssl_dir/server.key"
        chmod 644 "$ssl_dir/server.crt"
        
        log "SSL 证书生成完成"
    else
        log "SSL 证书已存在，跳过生成"
    fi
}

# 配置 Nginx
configure_nginx() {
    log "配置 Nginx..."
    
    local nginx_conf="$DEPLOY_DIR/config/nginx/default.conf"
    
    cat > "$nginx_conf" << 'EOF'
# Nginx configuration for Intelligent Work Assistant
upstream app_backend {
    server app:5000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name _;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/certs/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Rate limiting
    limit_req zone=general burst=10 nodelay;
    
    # Client settings
    client_max_body_size 20M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Proxy settings
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    
    # Main application
    location / {
        proxy_pass http://app_backend;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # API endpoints with specific rate limiting
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://app_backend;
    }
    
    location /api/upload/ {
        limit_req zone=upload burst=3 nodelay;
        client_max_body_size 50M;
        proxy_pass http://app_backend;
        proxy_read_timeout 600s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://app_backend;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://app_backend;
    }
    
    # Block access to sensitive files
    location ~ /\.(env|git|svn|htaccess|htpasswd) {
        deny all;
        return 404;
    }
}

# Rate limiting zones (add to nginx.conf)
# limit_req_zone $binary_remote_addr zone=general:10m rate=100r/m;
# limit_req_zone $binary_remote_addr zone=auth:10m rate=20r/m;
# limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;
EOF
    
    log "Nginx 配置完成"
}

# 配置数据库初始化脚本
configure_database() {
    log "配置数据库初始化脚本..."
    
    local mongo_init="$DEPLOY_DIR/scripts/mongo-init.js"
    
    cat > "$mongo_init" << 'EOF'
// MongoDB initialization script
db = db.getSiblingDB('intelligent_work_assistant');

// Create application user
db.createUser({
  user: 'iwa_user',
  pwd: process.env.MONGODB_USER_PASSWORD,
  roles: [
    {
      role: 'readWrite',
      db: 'intelligent_work_assistant'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ wechatOpenId: 1 });
db.tasks.createIndex({ userId: 1, createdAt: -1 });
db.meetings.createIndex({ userId: 1, scheduledAt: 1 });
db.documents.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
db.wechatBindings.createIndex({ openid: 1 }, { unique: true });
db.wechatBindings.createIndex({ bindCode: 1 });

print('Database initialization completed');
EOF
    
    # 生成 MongoDB keyfile
    openssl rand -base64 741 > "$DEPLOY_DIR/config/mongodb/mongodb-keyfile"
    chmod 600 "$DEPLOY_DIR/config/mongodb/mongodb-keyfile"
    chown 999:999 "$DEPLOY_DIR/config/mongodb/mongodb-keyfile"
    
    log "数据库配置完成"
}

# 创建备份脚本
create_backup_script() {
    log "创建备份脚本..."
    
    local backup_script="$DEPLOY_DIR/scripts/backup.sh"
    
    cat > "$backup_script" << 'EOF'
#!/bin/bash

# Intelligent Work Assistant Backup Script
# 智能工作助手备份脚本

set -euo pipefail

BACKUP_DIR="/opt/intelligent-work-assistant/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONGODB_CONTAINER="iwa-mongodb"
REDIS_CONTAINER="iwa-redis"

# Create backup directories
mkdir -p "$BACKUP_DIR/mongodb/$TIMESTAMP"
mkdir -p "$BACKUP_DIR/redis/$TIMESTAMP"
mkdir -p "$BACKUP_DIR/files/$TIMESTAMP"

echo "Starting backup process..."

# Backup MongoDB
echo "Backing up MongoDB..."
docker exec $MONGODB_CONTAINER mongodump --authenticationDatabase admin -u root -p "$MONGODB_ROOT_PASSWORD" --out "/backups/mongodb/$TIMESTAMP"

# Backup Redis
echo "Backing up Redis..."
docker exec $REDIS_CONTAINER redis-cli -a "$REDIS_PASSWORD" --rdb "/data/dump_$TIMESTAMP.rdb"
docker cp "$REDIS_CONTAINER:/data/dump_$TIMESTAMP.rdb" "$BACKUP_DIR/redis/$TIMESTAMP/"

# Backup application files
echo "Backing up application files..."
cp -r /opt/intelligent-work-assistant/uploads "$BACKUP_DIR/files/$TIMESTAMP/"
cp /opt/intelligent-work-assistant/.env.production "$BACKUP_DIR/files/$TIMESTAMP/"

# Compress backups
echo "Compressing backups..."
cd "$BACKUP_DIR"
tar -czf "iwa_backup_$TIMESTAMP.tar.gz" "mongodb/$TIMESTAMP" "redis/$TIMESTAMP" "files/$TIMESTAMP"

# Clean up individual directories
rm -rf "mongodb/$TIMESTAMP" "redis/$TIMESTAMP" "files/$TIMESTAMP"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "iwa_backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: iwa_backup_$TIMESTAMP.tar.gz"
EOF
    
    chmod +x "$backup_script"
    
    # 创建 crontab 条目 (每天凌晨 2 点备份)
    (crontab -l 2>/dev/null; echo "0 2 * * * $backup_script >> /var/log/iwa-backup.log 2>&1") | crontab -
    
    log "备份脚本创建完成"
}

# 配置监控
setup_monitoring() {
    log "配置监控系统..."
    
    # Prometheus 配置
    cat > "$DEPLOY_DIR/monitoring/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'intelligent-work-assistant'
    static_configs:
      - targets: ['app:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s
EOF
    
    log "监控配置完成"
}

# 启动服务
start_services() {
    log "启动服务..."
    
    cd "$DEPLOY_DIR"
    
    # 拉取最新镜像
    docker-compose -f docker-compose.prod.yml pull
    
    # 启动服务
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 健康检查
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:5000/health > /dev/null; then
            log "服务启动成功！"
            break
        fi
        
        warn "等待服务启动... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "服务启动失败，请检查日志"
    fi
    
    # 显示服务状态
    docker-compose -f docker-compose.prod.yml ps
}

# 显示部署信息
show_deployment_info() {
    log "部署完成！"
    
    echo ""
    echo "================================"
    echo "🎉 智能工作助手部署信息"
    echo "================================"
    echo "📁 部署目录: $DEPLOY_DIR"
    echo "🌐 应用地址: https://$(hostname -f)"
    echo "📚 API 文档: https://$(hostname -f)/api-docs"
    echo "🔍 健康检查: https://$(hostname -f)/health"
    echo ""
    echo "🔧 管理命令:"
    echo "  启动服务: cd $DEPLOY_DIR && docker-compose -f docker-compose.prod.yml up -d"
    echo "  停止服务: cd $DEPLOY_DIR && docker-compose -f docker-compose.prod.yml down"
    echo "  查看日志: cd $DEPLOY_DIR && docker-compose -f docker-compose.prod.yml logs -f"
    echo "  执行备份: $DEPLOY_DIR/scripts/backup.sh"
    echo ""
    echo "📋 配置文件:"
    echo "  应用配置: $DEPLOY_DIR/.env.production"
    echo "  Nginx 配置: $DEPLOY_DIR/config/nginx/default.conf"
    echo "  监控配置: $DEPLOY_DIR/monitoring/prometheus.yml"
    echo ""
    echo "📊 可选监控服务 (需要启用):"
    echo "  Prometheus: http://$(hostname -f):9090"
    echo "  Grafana: http://$(hostname -f):3001"
    echo "  Kibana: http://$(hostname -f):5601"
    echo ""
    echo "启用监控: cd $DEPLOY_DIR && docker-compose --profile monitoring -f docker-compose.prod.yml up -d"
    echo "启用日志: cd $DEPLOY_DIR && docker-compose --profile logging -f docker-compose.prod.yml up -d"
    echo ""
}

# ================================
# 主函数
# ================================
main() {
    log "开始部署智能工作助手..."
    
    # 预检查
    check_root
    check_requirements
    
    # 部署步骤
    create_directories
    copy_project_files
    generate_ssl_certificates
    configure_nginx
    configure_database
    create_backup_script
    setup_monitoring
    start_services
    
    # 完成部署
    show_deployment_info
    
    log "部署完成！🎉"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi