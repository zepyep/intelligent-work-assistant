# Clacky 公网环境配置指南

本文档描述了为支持Clacky公网环境而进行的配置更改，避免直接访问 `http://localhost:5000/api/` 导致的异常。

## 配置更改总结

### 1. 后端CORS配置更新

**文件**: `server/config/cors.js`

- 添加了对Clacky环境域名的支持 (`*.clackypaas.com`)
- 增加了更多本地地址支持 (`127.0.0.1`, `0.0.0.0`)
- 使用正则表达式匹配Clacky域名模式

### 2. 前端API配置优化

**文件**: `client/src/services/api.ts`

- 更新了API基地址配置逻辑
- 开发环境使用localhost代理
- 生产环境使用相对路径 `/api`

### 3. 环境变量配置

**文件**: `client/.env`
- 添加 `REACT_APP_API_URL=/api` 配置

**文件**: `client/.env.production`
- 创建生产环境配置文件

### 4. 服务器监听配置

**文件**: `server/index.js`
- 服务器现在监听 `0.0.0.0` 而非 `localhost`
- 支持公网访问

### 5. Clacky环境配置

**文件**: `/home/runner/.clackyai/.environments.yaml`
- 配置项目启动命令
- 定义依赖安装命令
- 配置代码检查工具

## 技术架构

```
公网用户 -> Clacky平台 -> 前端(3000端口) -> 代理 -> 后端API(5000端口)
```

### 代理机制

1. **开发环境**: React开发服务器使用proxy配置将API请求转发到5000端口
2. **生产环境**: Nginx反向代理处理API请求路由
3. **API基地址**: 使用相对路径 `/api` 避免硬编码localhost

## 验证结果

✅ 后端服务正常启动在 `http://0.0.0.0:5000`
✅ 前端服务正常启动在端口3000
✅ API代理配置正常工作
✅ CORS配置支持Clacky域名
✅ 健康检查端点可通过代理访问

## 使用说明

### 本地开发
```bash
npm run dev          # 同时启动前端和后端
npm run server       # 只启动后端
npm run client       # 只启动前端
```

### Clacky环境
直接点击"RUN"按钮即可启动项目，配置会自动生效。

### API访问方式
- 直接访问后端: `http://localhost:5000/api/endpoint`
- 通过代理访问: `http://localhost:3000/api/endpoint` （推荐）

## 注意事项

1. 前端会自动根据环境选择正确的API地址
2. CORS配置支持Clacky环境和本地开发
3. 服务器绑定到0.0.0.0以支持公网访问
4. 代理配置确保API请求正确路由到后端服务

## 相关文件

- `server/config/cors.js` - CORS跨域配置
- `client/src/services/api.ts` - API客户端配置
- `client/.env` - 前端环境变量
- `server/index.js` - 服务器启动配置
- `/home/runner/.clackyai/.environments.yaml` - Clacky环境配置