# 微信公众号配置指南

## 1. 微信公众平台设置

### 1.1 获取微信公众号配置信息

访问 [微信公众平台](https://mp.weixin.qq.com/) 并登录您的公众号管理后台。

#### 基本配置
1. **开发 > 基本配置** 页面获取：
   - `AppID (应用ID)`: 公众号的唯一标识
   - `AppSecret (应用密钥)`: 公众号的应用密钥

2. **服务器配置**：
   - `Token`: 自定义的验证Token（建议使用随机字符串）
   - `EncodingAESKey`: 消息加解密密钥（可选）

### 1.2 服务器配置

#### URL配置
- **服务器地址(URL)**: `https://yourdomain.com/wechat`
- **令牌(Token)**: 与环境变量 `WECHAT_TOKEN` 保持一致
- **消息加解密方式**: 建议选择"安全模式"

#### 环境变量配置
```bash
# .env 文件配置
WECHAT_APPID=您的AppID
WECHAT_APPSECRET=您的AppSecret
WECHAT_TOKEN=您设置的Token
WECHAT_ENCODING_AES_KEY=您的EncodingAESKey（如使用加密模式）
```

## 2. 微信公众号菜单配置

### 2.1 自定义菜单结构

```json
{
  "button": [
    {
      "name": "📋 任务助手",
      "sub_button": [
        {
          "type": "click",
          "name": "任务规划",
          "key": "TASK_PLANNING"
        },
        {
          "type": "click",
          "name": "待办查询", 
          "key": "TODO_QUERY"
        },
        {
          "type": "click",
          "name": "进度跟踪",
          "key": "PROGRESS_TRACK"
        }
      ]
    },
    {
      "name": "📄 资料中心",
      "sub_button": [
        {
          "type": "click",
          "name": "文档分析",
          "key": "DOCUMENT_ANALYSIS"
        },
        {
          "type": "click", 
          "name": "资料搜索",
          "key": "DOCUMENT_SEARCH"
        },
        {
          "type": "view",
          "name": "上传文件",
          "url": "https://yourdomain.com/upload"
        }
      ]
    },
    {
      "name": "📅 日程管理",
      "sub_button": [
        {
          "type": "click",
          "name": "今日日程",
          "key": "TODAY_SCHEDULE"
        },
        {
          "type": "click",
          "name": "添加事件",
          "key": "ADD_EVENT" 
        },
        {
          "type": "click",
          "name": "账号绑定",
          "key": "BIND_ACCOUNT"
        }
      ]
    }
  ]
}
```

### 2.2 创建菜单API调用

```bash
# 使用服务端API创建菜单
curl -X POST http://localhost:5000/api/wechat-admin/create-menu \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## 3. 验证配置

### 3.1 URL验证测试

微信公众平台在保存服务器配置时会发送GET请求验证URL有效性：

```
GET https://yourdomain.com/wechat?signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx
```

我们的服务器会自动处理这个验证请求。

### 3.2 消息接收测试

配置完成后，可以通过以下方式测试：

1. **关注公众号**
2. **发送测试消息**：
   - 发送 "帮助" 查看功能列表
   - 发送 6位数字测试绑定功能
   - 点击自定义菜单测试功能

## 4. 开发环境配置

### 4.1 本地开发

如果需要在本地开发环境测试微信功能，建议使用ngrok等内网穿透工具：

```bash
# 安装ngrok
npm install -g ngrok

# 启动内网穿透
ngrok http 5000

# 使用ngrok提供的HTTPS地址配置微信webhook
```

### 4.2 生产环境部署

1. **HTTPS要求**: 微信公众号要求服务器支持HTTPS
2. **域名配置**: 确保域名已备案（中国大陆）
3. **SSL证书**: 配置有效的SSL证书

## 5. 功能测试流程

### 5.1 账号绑定测试

1. 用户关注公众号
2. 用户在网页端登录并生成绑定码
3. 用户在微信中发送6位绑定码
4. 系统返回绑定成功消息
5. 用户可以使用微信进行后续操作

### 5.2 智能功能测试

1. **任务规划**: 发送 "帮我安排明天的工作"
2. **文档分析**: 发送 "分析项目文档"
3. **日程查询**: 发送 "我今天有什么会议"
4. **语音处理**: 直接发送语音消息

## 6. 常见问题

### 6.1 配置问题

**Q: URL验证失败？**
A: 检查服务器是否正常运行，Token是否匹配，服务器是否支持HTTPS

**Q: 消息无法接收？**
A: 检查webhook配置是否正确，服务器日志是否有错误信息

**Q: 菜单不显示？**
A: 菜单创建后需要24小时生效，或者取消关注后重新关注

### 6.2 开发问题

**Q: 本地测试如何配置？**
A: 使用ngrok等工具暴露本地端口，配置临时的HTTPS地址

**Q: 如何调试消息处理？**
A: 查看服务器日志 `/server/logs/` 目录下的日志文件

## 7. 安全注意事项

1. **AppSecret保护**: 不要将AppSecret提交到代码仓库
2. **Token验证**: 确保所有消息都经过Token验证
3. **用户数据**: 妥善保护用户的微信信息和绑定关系
4. **访问控制**: 实施适当的API访问频率限制

## 8. 监控和维护

### 8.1 日志监控

- 监控webhook接收到的消息
- 记录绑定和解绑操作
- 追踪API调用频率和错误

### 8.2 性能优化

- 使用Redis缓存访问令牌
- 优化数据库查询
- 实施消息队列处理高并发

---

配置完成后，您的智能工作助手就可以通过微信公众号为用户提供服务了！