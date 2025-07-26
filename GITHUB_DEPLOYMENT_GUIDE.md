# 🚀 智能工作助手应用 - GitHub部署指南

## 📋 概述

本指南将帮助您将智能工作助手应用部署到GitHub，并设置自动化CI/CD流程。

## 🎯 部署架构

```
GitHub Repository
├── 📁 .github/workflows/    # GitHub Actions工作流
├── 📁 client/               # React前端应用
├── 📁 server/               # Node.js后端API
├── 📁 nginx/               # Nginx配置
├── 📁 scripts/             # 部署脚本
├── 🐳 Dockerfile.prod      # 生产环境Docker配置
├── 🐳 docker-compose.prod.yml  # Docker Compose配置
└── 📄 .env.production.example  # 环境变量模板
```

## 🔧 快速开始

### 1. 创建GitHub仓库

```bash
# 在GitHub上创建新仓库: intelligent-work-assistant

# 克隆到本地
git clone https://github.com/your-username/intelligent-work-assistant.git
cd intelligent-work-assistant

# 将应用代码推送到仓库
git add .
git commit -m "🎉 Initial commit: 智能工作助手应用"
git push origin main
```

### 2. 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets:

```bash
# 必需的环境变量
MONGODB_URI=mongodb://admin:admin123@mongo:27017/intelligent-work-assistant
JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production

# 微信公众号配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token

# AI服务API密钥
OPENAI_API_KEY=sk-your-openai-api-key
QWEN_API_KEY=your-qwen-api-key
PPIO_API_KEY=your-ppio-api-key

# 邮件服务
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
FROM_EMAIL=your-email@gmail.com
```

### 3. 启用GitHub Actions

1. 进入仓库的 `Actions` 选项卡
2. 点击 `I understand my workflows, go ahead and enable them`
3. 工作流将在每次push到main分支时自动运行

## 🐳 Docker部署

### 本地测试部署

```bash
# 复制环境配置文件
cp .env.production.example .env.production

# 编辑配置文件，填入实际值
nano .env.production

# 启动完整服务栈
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看应用日志
docker-compose -f docker-compose.prod.yml logs -f app
```

### 服务访问地址

- **主应用**: http://localhost:3000
- **API文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **Prometheus**: http://localhost:9090

## 🔄 CI/CD流程

### 自动化工作流步骤

1. **🔍 代码质量检查**
   - ESLint代码风格检查
   - 单元测试执行
   - 依赖安全审计

2. **🔨 应用构建**
   - 后端依赖安装
   - 前端应用构建
   - 构建产物上传

3. **🔒 安全扫描**
   - NPM安全审计
   - 依赖漏洞检查
   - 安全最佳实践验证

4. **🐳 Docker构建**
   - 多阶段Docker镜像构建
   - 镜像推送到GitHub容器注册表
   - 镜像缓存优化

5. **🚀 生产部署**
   - 自动化部署到生产环境
   - 健康检查验证
   - 部署状态通知

### 分支保护规则

建议设置以下分支保护规则：

```yaml
main分支保护:
  - 要求pull request reviews
  - 要求状态检查通过
  - 要求分支是最新的
  - 限制推送权限
```

## 🌐 生产环境部署

### 云服务器部署

1. **准备服务器**
```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **部署应用**
```bash
# 克隆仓库
git clone https://github.com/your-username/intelligent-work-assistant.git
cd intelligent-work-assistant

# 配置环境变量
cp .env.production.example .env.production
# 编辑.env.production文件

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

3. **设置域名和SSL**
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Kubernetes部署

```yaml
# 使用提供的Kubernetes配置文件
kubectl apply -f kubernetes/

# 查看部署状态
kubectl get pods -n smart-work-assistant
kubectl get services -n smart-work-assistant
```

## 📊 监控和日志

### 查看应用日志

```bash
# 应用服务日志
docker-compose logs -f app

# 数据库日志
docker-compose logs -f mongo

# Nginx访问日志
docker-compose logs -f nginx
```

### 监控指标

访问Prometheus监控面板：
- **URL**: http://localhost:9090
- **指标**: 应用性能、请求量、错误率等

## 🔧 常见问题排查

### 1. 构建失败

```bash
# 检查Node.js版本兼容性
node --version  # 确保是18.x

# 清理缓存重新构建
npm cache clean --force
docker system prune -a
```

### 2. 数据库连接问题

```bash
# 检查MongoDB容器状态
docker-compose ps mongo

# 查看数据库日志
docker-compose logs mongo

# 手动连接测试
docker-compose exec mongo mongosh -u admin -p admin123
```

### 3. 微信集成问题

```bash
# 验证微信配置
curl -X GET "http://localhost:3000/wechat?signature=xxx&timestamp=xxx&nonce=xxx&echostr=test"

# 检查Webhook日志
docker-compose logs -f app | grep wechat
```

## 🚀 扩容和优化

### 水平扩容

```yaml
# 增加应用实例
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# 配置负载均衡
# 修改nginx.conf中的upstream配置
```

### 性能优化

1. **启用Redis缓存**
2. **配置CDN**
3. **数据库索引优化**
4. **静态资源压缩**

## 📞 技术支持

### 常用命令

```bash
# 查看系统状态
./scripts/check-system-health.sh

# 备份数据
./scripts/backup-database.sh

# 更新应用
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### 联系方式

- **问题反馈**: 在GitHub Issues中提交
- **文档**: 参考项目README.md
- **监控**: 查看Prometheus面板

---

## 🎉 部署成功！

恭喜！您已经成功将智能工作助手应用部署到GitHub，并配置了完整的CI/CD流程。

**下一步:**
1. 访问应用并进行功能测试
2. 配置监控和告警
3. 设置自动备份
4. 优化性能和扩容

**智能工作助手应用现已准备好为您的团队提供高效的工作协作体验！** 🚀