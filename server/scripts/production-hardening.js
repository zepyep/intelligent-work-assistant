#!/usr/bin/env node

/**
 * 生产环境安全加固脚本
 * 自动配置生产环境的安全设置
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ProductionHardening {
  constructor() {
    this.configPath = path.join(__dirname, '../.env.production');
    this.backupPath = path.join(__dirname, '../.env.production.backup');
  }

  generateSecureKey(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateJWTSecret() {
    return crypto.randomBytes(64).toString('base64');
  }

  createProductionConfig() {
    console.log('🔧 生成生产环境配置...\n');

    const config = `# 生产环境配置文件
# 由 production-hardening.js 自动生成于 ${new Date().toISOString()}
# ⚠️  请根据实际情况修改相关配置

# 基础环境配置
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

# 数据库配置
MONGODB_URI=mongodb://username:password@your-db-host:27017/intelligent-work-assistant?ssl=true&authSource=admin

# JWT 安全配置
JWT_SECRET=${this.generateJWTSecret()}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 数据加密配置
ENCRYPTION_SECRET=${this.generateSecureKey(32)}
USER_DATA_KEY=${this.generateSecureKey(32)}
WECHAT_ENCRYPTION_KEY=${this.generateSecureKey(32)}
API_TOKEN_KEY=${this.generateSecureKey(32)}

# 会话管理
SESSION_SECRET=${this.generateSecureKey(64)}
SESSION_MAX_AGE=86400000

# 密码策略
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_SYMBOLS=true
PASSWORD_MAX_ATTEMPTS=5
PASSWORD_LOCKOUT_DURATION=900

# HTTPS 配置
HTTPS_ENABLED=true
FORCE_HTTPS=true

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS 配置
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# IP 白名单（可选）
ENABLE_IP_WHITELIST=false
ALLOWED_IPS=127.0.0.1,::1

# 文件上传安全
MAX_FILE_SIZE=20971520
ENABLE_VIRUS_SCAN=true
QUARANTINE_PATH=./quarantine

# API 密钥配置
ADMIN_API_KEYS=${this.generateSecureKey(32)},${this.generateSecureKey(32)}
SYSTEM_API_KEYS=${this.generateSecureKey(32)}
WECHAT_WEBHOOK_KEY=${this.generateSecureKey(32)}

# 第三方服务配置
OPENAI_API_KEY=your-openai-api-key
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret

# 数据库安全
DB_SSL=true
DB_QUERY_TIMEOUT=30000
DB_POOL_SIZE=10
BACKUP_ENCRYPTION=true

# 日志安全
FILTER_SENSITIVE_DATA=true
ENCRYPT_LOGS=true
ENABLE_AUDIT_LOG=true

# 安全监控
ENABLE_ANOMALY_DETECTION=true
ENABLE_INTRUSION_DETECTION=true
ENABLE_SECURITY_ALERTS=true
SECURITY_ALERT_WEBHOOK=https://your-alert-webhook.com
SECURITY_ALERT_EMAIL=security@your-domain.com

# 邮件服务配置
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@your-domain.com
SMTP_PASS=your-email-password

# 文件存储配置（推荐云存储）
STORAGE_TYPE=cloud
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket

# 监控和性能
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_THRESHOLD=5000

# 备份配置
ENABLE_AUTO_BACKUP=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30

# 容器化环境（Docker/Kubernetes）
CONTAINER_MODE=false
HEALTH_CHECK_PORT=5001
`;

    return config;
  }

  backupExistingConfig() {
    if (fs.existsSync(this.configPath)) {
      console.log('📋 备份现有配置文件...\n');
      fs.copyFileSync(this.configPath, this.backupPath);
      console.log(`✅ 备份已保存至: ${this.backupPath}\n`);
    }
  }

  writeProductionConfig() {
    const config = this.createProductionConfig();
    
    try {
      fs.writeFileSync(this.configPath, config);
      console.log(`✅ 生产环境配置已创建: ${this.configPath}\n`);
    } catch (error) {
      console.error('❌ 写入配置文件失败:', error.message);
      process.exit(1);
    }
  }

  createSecurityDirectories() {
    console.log('📁 创建安全相关目录...\n');

    const directories = [
      path.join(__dirname, '../logs'),
      path.join(__dirname, '../logs/security'),
      path.join(__dirname, '../logs/audit'),
      path.join(__dirname, '../quarantine'),
      path.join(__dirname, '../backups'),
      path.join(__dirname, '../uploads/temp'),
      path.join(__dirname, '../uploads/documents'),
      path.join(__dirname, '../uploads/audio'),
      path.join(__dirname, '../uploads/images')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o750 });
        console.log(`✅ 创建目录: ${dir}`);
      } else {
        console.log(`📁 目录已存在: ${dir}`);
      }
    });

    console.log('');
  }

  setDirectoryPermissions() {
    console.log('🔒 设置目录权限...\n');

    const permissionSettings = [
      { path: path.join(__dirname, '../logs'), mode: 0o750 },
      { path: path.join(__dirname, '../quarantine'), mode: 0o700 },
      { path: path.join(__dirname, '../backups'), mode: 0o700 },
      { path: path.join(__dirname, '../uploads'), mode: 0o755 },
      { path: this.configPath, mode: 0o600 }
    ];

    permissionSettings.forEach(({ path: dirPath, mode }) => {
      if (fs.existsSync(dirPath)) {
        try {
          fs.chmodSync(dirPath, mode);
          console.log(`✅ 设置权限 ${mode.toString(8)}: ${dirPath}`);
        } catch (error) {
          console.log(`⚠️  无法设置权限 ${dirPath}: ${error.message}`);
        }
      }
    });

    console.log('');
  }

  createNginxConfig() {
    console.log('⚙️  生成 Nginx 安全配置...\n');

    const nginxConfig = `# Nginx 安全配置示例
# /etc/nginx/sites-available/intelligent-work-assistant

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self';";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()";

    # 隐藏服务器信息
    server_tokens off;

    # 客户端最大请求大小
    client_max_body_size 20M;

    # 限流配置
    limit_req zone=api burst=10 nodelay;
    limit_req zone=auth burst=5 nodelay;

    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 安全配置
        proxy_hide_header X-Powered-By;
        proxy_set_header X-Forwarded-Host $server_name;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }

    # 禁止访问敏感文件
    location ~ /\.(env|git|svn|htaccess|htpasswd) {
        deny all;
        return 404;
    }

    location ~ \.(log|sql|json|md)$ {
        deny all;
        return 404;
    }

    # 访问日志
    access_log /var/log/nginx/intelligent-work-assistant.access.log;
    error_log /var/log/nginx/intelligent-work-assistant.error.log;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# 限流配置（在 http 块中配置）
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=20r/m;
`;

    const nginxPath = path.join(__dirname, '../nginx-security.conf');
    fs.writeFileSync(nginxPath, nginxConfig);
    console.log(`✅ Nginx 配置已创建: ${nginxPath}\n`);
  }

  createDockerSecurityConfig() {
    console.log('🐳 生成 Docker 安全配置...\n');

    const dockerConfig = `# Docker Compose 生产环境配置
# docker-compose.prod.yml

version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    user: "1001:1001"
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /var/run:noexec,nosuid,size=100m
    volumes:
      - ./logs:/app/logs:rw
      - ./uploads:/app/uploads:rw
      - ./backups:/app/backups:rw
    networks:
      - app-network
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:5.0
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure_password
      MONGO_INITDB_DATABASE: intelligent_work_assistant
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - app-network
    security_opt:
      - no-new-privileges:true
    
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass secure_redis_password --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app-network
    security_opt:
      - no-new-privileges:true

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-security.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/ssl:ro
      - ./logs:/var/log/nginx:rw
    networks:
      - app-network
    security_opt:
      - no-new-privileges:true
    depends_on:
      - app

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
`;

    const dockerPath = path.join(__dirname, '../docker-compose.prod.yml');
    fs.writeFileSync(dockerPath, dockerConfig);
    console.log(`✅ Docker 配置已创建: ${dockerPath}\n`);

    // 创建 Dockerfile.prod
    const dockerfile = `FROM node:18-alpine

# 创建非特权用户
RUN addgroup -g 1001 -S appgroup && \\
    adduser -S appuser -u 1001 -G appgroup

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 设置权限
RUN chown -R appuser:appgroup /app && \\
    chmod -R 755 /app && \\
    mkdir -p /app/logs /app/uploads /app/backups && \\
    chown -R appuser:appgroup /app/logs /app/uploads /app/backups

# 切换到非特权用户
USER appuser

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

# 启动应用
CMD ["node", "server.js"]
`;

    const dockerfilePath = path.join(__dirname, '../Dockerfile.prod');
    fs.writeFileSync(dockerfilePath, dockerfile);
    console.log(`✅ Dockerfile.prod 已创建: ${dockerfilePath}\n`);
  }

  createSecurityChecklist() {
    console.log('📝 生成安全检查清单...\n');

    const checklist = `# 生产环境安全检查清单

## 🔒 环境配置
- [ ] 设置 NODE_ENV=production
- [ ] 配置强密码的 JWT_SECRET
- [ ] 配置所有加密密钥
- [ ] 设置适当的 CORS 策略
- [ ] 配置 HTTPS 证书

## 🛡️ 服务器安全
- [ ] 启用防火墙，只开放必要端口
- [ ] 配置 fail2ban 防止暴力破解
- [ ] 定期更新系统和依赖
- [ ] 配置自动安全更新
- [ ] 设置服务器监控

## 📊 数据库安全
- [ ] 启用 MongoDB 认证
- [ ] 配置数据库 SSL 连接
- [ ] 限制数据库网络访问
- [ ] 配置数据库备份加密
- [ ] 设置数据库连接池限制

## 🚦 网络安全
- [ ] 配置 Nginx/Apache 反向代理
- [ ] 启用 HTTPS 和 HTTP/2
- [ ] 配置安全头部
- [ ] 设置速率限制
- [ ] 配置 DDoS 防护

## 📁 文件系统安全
- [ ] 设置适当的文件权限
- [ ] 配置文件上传限制
- [ ] 启用病毒扫描
- [ ] 设置日志轮转
- [ ] 配置备份策略

## 🔍 监控和日志
- [ ] 启用访问日志
- [ ] 配置错误日志
- [ ] 设置安全审计日志
- [ ] 配置实时监控
- [ ] 设置告警通知

## 🔄 持续安全
- [ ] 定期安全扫描
- [ ] 漏洞评估
- [ ] 渗透测试
- [ ] 安全培训
- [ ] 应急响应计划

## 📋 合规检查
- [ ] GDPR 数据保护
- [ ] 数据脱敏处理
- [ ] 用户隐私政策
- [ ] 数据保留策略
- [ ] 安全事件记录

## 🚨 应急准备
- [ ] 备份恢复流程
- [ ] 安全事件响应
- [ ] 业务连续性计划
- [ ] 联系人清单
- [ ] 沟通模板

执行安全检查：
\`\`\`bash
node scripts/security-check.js
\`\`\`

执行生产加固：
\`\`\`bash
node scripts/production-hardening.js
\`\`\`
`;

    const checklistPath = path.join(__dirname, '../SECURITY-CHECKLIST.md');
    fs.writeFileSync(checklistPath, checklist);
    console.log(`✅ 安全检查清单已创建: ${checklistPath}\n`);
  }

  printNextSteps() {
    console.log('📋 下一步操作指南');
    console.log('================\n');

    console.log('1. 🔧 完善生产环境配置：');
    console.log('   - 编辑 .env.production 文件');
    console.log('   - 填入实际的数据库连接信息');
    console.log('   - 配置第三方服务密钥');
    console.log('   - 设置域名和邮件服务\n');

    console.log('2. 🔒 SSL 证书配置：');
    console.log('   - 获取 SSL 证书（Let\'s Encrypt 或商业证书）');
    console.log('   - 配置 Nginx SSL 设置');
    console.log('   - 测试 HTTPS 访问\n');

    console.log('3. 🗄️ 数据库设置：');
    console.log('   - 创建生产数据库');
    console.log('   - 配置数据库用户和权限');
    console.log('   - 设置数据库备份策略\n');

    console.log('4. 🐳 容器化部署（可选）：');
    console.log('   - 构建 Docker 镜像');
    console.log('   - 配置 Docker Compose');
    console.log('   - 设置容器监控\n');

    console.log('5. ✅ 安全验证：');
    console.log('   - 运行安全检查脚本');
    console.log('   - 执行渗透测试');
    console.log('   - 配置监控告警\n');

    console.log('6. 📊 性能优化：');
    console.log('   - 配置缓存策略');
    console.log('   - 设置 CDN');
    console.log('   - 优化数据库查询\n');

    console.log('运行安全检查：');
    console.log('node scripts/security-check.js\n');
  }

  run() {
    console.log('🛡️  智能工作助手生产环境安全加固工具 v1.0.0');
    console.log('==========================================\n');

    console.log('⚠️  注意：此脚本将生成生产环境配置文件');
    console.log('请根据实际情况修改配置，确保安全性！\n');

    try {
      this.backupExistingConfig();
      this.writeProductionConfig();
      this.createSecurityDirectories();
      this.setDirectoryPermissions();
      this.createNginxConfig();
      this.createDockerSecurityConfig();
      this.createSecurityChecklist();
      
      console.log('🎉 生产环境安全加固完成！\n');
      this.printNextSteps();

    } catch (error) {
      console.error('❌ 加固过程中出现错误:', error.message);
      process.exit(1);
    }
  }
}

// 运行生产环境加固
if (require.main === module) {
  const hardening = new ProductionHardening();
  hardening.run();
}

module.exports = ProductionHardening;