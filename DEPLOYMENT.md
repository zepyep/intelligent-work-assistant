# 🚀 智能工作助手部署指南
# Intelligent Work Assistant Deployment Guide

## 📋 概述

本文档提供智能工作助手应用的完整部署指南，涵盖多种部署方式和环境配置。

---

## 🎯 支持的部署方式

### 1. 📦 Docker Compose 部署 (推荐用于开发/小型生产环境)
### 2. ☁️ AWS 云部署 (推荐用于生产环境)
### 3. ⚡ Kubernetes 部署 (推荐用于大规模生产环境)
### 4. 🖥️ 传统服务器部署

---

## 🚀 快速开始

### 前提条件

```bash
# 系统要求
- CPU: 2核心+ 
- RAM: 4GB+
- 磁盘: 20GB+
- 操作系统: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2

# 必需软件
- Docker 20.10+
- Docker Compose 2.0+
- Git
- Node.js 18+ (如果本地开发)
```

### 一键部署脚本

```bash
# 克隆项目
git clone https://github.com/your-repo/intelligent-work-assistant.git
cd intelligent-work-assistant

# 运行自动部署脚本
sudo chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

---

## 📦 Docker Compose 部署

### 步骤 1: 环境配置

```bash
# 复制环境配置模板
cp server/.env.example .env.production

# 编辑配置文件
nano .env.production
```

**重要配置项:**
```env
# 基础配置
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

# 数据库
MONGODB_URI=mongodb://admin:password@mongodb:27017/intelligent_work_assistant
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=your_secure_password

# Redis 缓存
REDIS_PASSWORD=your_redis_password

# JWT 安全
JWT_SECRET=your_very_long_jwt_secret_key

# AI 服务
OPENAI_API_KEY=your_openai_api_key

# 微信配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
```

### 步骤 2: 启动服务

```bash
# 构建并启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 启用监控服务 (可选)
docker-compose --profile monitoring -f docker-compose.prod.yml up -d

# 启用日志收集 (可选)
docker-compose --profile logging -f docker-compose.prod.yml up -d
```

### 步骤 3: 验证部署

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看应用日志
docker-compose -f docker-compose.prod.yml logs -f app

# 健康检查
curl -f https://your-domain.com/health
curl -f https://your-domain.com/api-docs
```

---

## ☁️ AWS 云部署

### 使用 Terraform 自动部署

#### 步骤 1: 准备工作

```bash
# 安装 Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# 配置 AWS CLI
aws configure
```

#### 步骤 2: 部署基础设施

```bash
cd terraform

# 初始化 Terraform
terraform init

# 查看执行计划
terraform plan -var="environment=production"

# 应用配置
terraform apply -var="environment=production"
```

#### 步骤 3: 获取部署信息

```bash
# 获取输出信息
terraform output

# 重要输出:
# - load_balancer_dns: 应用访问地址
# - database_endpoint: 数据库连接地址
# - s3_bucket_name: 文件存储桶名称
```

### AWS 资源概览

```
📊 部署的 AWS 资源:
├── 🌐 VPC 网络环境
├── 🔀 Application Load Balancer
├── 🖥️ Auto Scaling Group (EC2 实例)
├── 🗄️ DocumentDB (MongoDB 兼容)
├── ⚡ ElastiCache (Redis)
├── 📦 S3 存储桶
├── 🔐 KMS 密钥管理
├── 🔒 IAM 角色和策略
├── 📋 Secrets Manager
├── 🔔 CloudWatch 监控
└── 📧 SNS 告警通知
```

---

## ⚡ Kubernetes 部署

### 步骤 1: 准备 Kubernetes 集群

```bash
# 对于 AWS EKS
eksctl create cluster --name iwa-cluster --region us-east-1 --nodes 3

# 对于本地开发 (使用 minikube)
minikube start --cpus=4 --memory=8192mb
```

### 步骤 2: 配置密钥

```bash
# 创建 namespace
kubectl create namespace intelligent-work-assistant

# 创建 secrets
kubectl create secret generic iwa-secrets \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=MONGODB_URI=your_mongodb_uri \
  --from-literal=OPENAI_API_KEY=your_openai_key \
  -n intelligent-work-assistant
```

### 步骤 3: 部署应用

```bash
# 应用 Kubernetes 配置
kubectl apply -f kubernetes/deployment.yaml

# 检查部署状态
kubectl get pods -n intelligent-work-assistant
kubectl get services -n intelligent-work-assistant
kubectl get ingress -n intelligent-work-assistant
```

### 步骤 4: 设置入口控制器

```bash
# 安装 NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# 安装 cert-manager (用于 SSL 证书)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.1/cert-manager.yaml
```

---

## 🔧 配置和管理

### 环境变量配置

| 变量名 | 描述 | 默认值 | 是否必需 |
|-------|------|--------|---------|
| `NODE_ENV` | 运行环境 | production | ✅ |
| `PORT` | 应用端口 | 5000 | ✅ |
| `JWT_SECRET` | JWT 密钥 | - | ✅ |
| `MONGODB_URI` | 数据库连接 | - | ✅ |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - | ✅ |
| `WECHAT_APP_ID` | 微信应用 ID | - | ✅ |
| `WECHAT_APP_SECRET` | 微信应用密钥 | - | ✅ |
| `REDIS_URL` | Redis 连接 | - | ❌ |
| `CLIENT_URL` | 前端地址 | http://localhost:3000 | ❌ |

### SSL 证书配置

#### 使用 Let's Encrypt (推荐)

```bash
# 安装 certbot
sudo apt-get install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 使用自签名证书 (仅用于测试)

```bash
# 生成私钥
openssl genrsa -out server.key 2048

# 生成证书
openssl req -new -x509 -key server.key -out server.crt -days 365
```

---

## 📊 监控和日志

### 性能监控

```bash
# Prometheus + Grafana 监控栈
docker-compose --profile monitoring -f docker-compose.prod.yml up -d

# 访问地址
- Prometheus: http://your-server:9090
- Grafana: http://your-server:3001 (admin/admin)
```

### 日志管理

```bash
# ELK 日志栈
docker-compose --profile logging -f docker-compose.prod.yml up -d

# 访问地址
- Kibana: http://your-server:5601
```

### 关键指标监控

```yaml
监控指标:
  - 🖥️ CPU 使用率 (阈值: 80%)
  - 💾 内存使用率 (阈值: 85%) 
  - 💿 磁盘使用率 (阈值: 90%)
  - 🌐 HTTP 响应时间 (阈值: 2s)
  - 📊 请求错误率 (阈值: 5%)
  - 🗄️ 数据库连接数
  - ⚡ Redis 命中率
```

---

## 🔒 安全配置

### 防火墙设置

```bash
# Ubuntu UFW
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 5000/tcp   # 拒绝直接访问应用端口
```

### 安全检查

```bash
# 运行安全检查脚本
node server/scripts/security-check.js

# 查看安全评分和建议
```

### SSL/TLS 配置

```nginx
# Nginx SSL 最佳实践
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
```

---

## 📋 备份和恢复

### 自动备份

```bash
# 设置自动备份 (已包含在部署脚本中)
/opt/intelligent-work-assistant/scripts/backup.sh

# Cron 任务 (每天凌晨 2 点)
0 2 * * * /opt/intelligent-work-assistant/scripts/backup.sh >> /var/log/iwa-backup.log 2>&1
```

### 备份内容

```
备份包含:
├── 📊 MongoDB 数据库
├── ⚡ Redis 数据
├── 📁 上传的文件
├── ⚙️ 配置文件
└── 📋 应用日志
```

### 恢复流程

```bash
# 停止服务
docker-compose -f docker-compose.prod.yml down

# 解压备份文件
tar -xzf iwa_backup_YYYYMMDD_HHMMSS.tar.gz

# 恢复数据库
docker exec iwa-mongodb mongorestore --drop /backups/mongodb/

# 恢复 Redis
docker cp backup/redis/dump.rdb iwa-redis:/data/

# 恢复文件
cp -r backup/files/* /opt/intelligent-work-assistant/uploads/

# 重启服务
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🚨 故障排除

### 常见问题

#### 1. 应用无法启动

```bash
# 检查日志
docker-compose -f docker-compose.prod.yml logs app

# 常见原因:
- 环境变量配置错误
- 数据库连接失败
- 端口冲突
```

#### 2. 数据库连接失败

```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml logs mongodb

# 测试连接
docker exec iwa-app curl -f mongodb:27017
```

#### 3. 微信功能异常

```bash
# 检查微信配置
echo $WECHAT_APP_ID
echo $WECHAT_APP_SECRET

# 验证 webhook 配置
curl -f https://your-domain.com/api/wechat/webhook
```

### 性能优化

#### 数据库优化

```javascript
// MongoDB 索引优化
db.users.createIndex({ email: 1 }, { unique: true })
db.tasks.createIndex({ userId: 1, createdAt: -1 })
db.meetings.createIndex({ userId: 1, scheduledAt: 1 })
```

#### 缓存优化

```bash
# Redis 内存优化
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 256mb
```

---

## 🔄 CI/CD 流程

### GitHub Actions 工作流

```yaml
部署流程:
1. 📝 代码推送到 main 分支
2. 🧪 自动运行测试和安全检查
3. 🏗️ 构建 Docker 镜像
4. 🚢 推送到镜像仓库
5. 🎯 自动部署到暂存环境
6. ✅ 运行集成测试
7. 🚀 部署到生产环境
8. 📊 健康检查和监控
9. 📧 发送部署通知
```

### 手动部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 滚动更新
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# 验证部署
curl -f https://your-domain.com/health
```

---

## 📞 支持和维护

### 日常维护任务

```bash
# 每周维护检查清单
□ 检查系统资源使用情况
□ 查看错误日志
□ 验证备份完整性
□ 更新安全补丁
□ 检查SSL证书有效期
□ 清理临时文件
□ 检查数据库性能
```

### 联系信息

```
🔧 技术支持: support@intelligent-assistant.com
📚 文档更新: docs@intelligent-assistant.com
🐛 Bug 报告: https://github.com/your-repo/issues
💬 社区讨论: https://discord.gg/intelligent-assistant
```

---

## 📚 更多资源

- [API 文档](https://intelligent-assistant.com/api-docs)
- [用户手册](./docs/user-guide.md)
- [开发指南](./docs/development.md)
- [微信配置指南](./docs/wechat-setup-guide.md)
- [AI 服务配置](./docs/ai-configuration-guide.md)

---

## 🏷️ 版本信息

- **当前版本**: v1.0.0
- **发布日期**: 2024-01-XX
- **兼容性**: Node.js 18+, MongoDB 5.0+, Redis 6.0+

---

**🎉 恭喜！您的智能工作助手现在已经成功部署！**

如果您在部署过程中遇到任何问题，请参考故障排除部分或联系技术支持。