# AI大模型配置指南

## 支持的AI提供商

智能工作助手支持多种AI大模型提供商，您可以根据需要选择最适合的服务：

### 1. OpenAI (GPT系列)
```bash
# .env 配置
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORGANIZATION=your-openai-organization
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com
```

### 2. Claude (Anthropic)
```bash
# .env 配置
AI_PROVIDER=claude
CLAUDE_API_KEY=your-claude-api-key
CLAUDE_API_URL=https://api.anthropic.com
```

### 3. 通义千问 (阿里云)
```bash
# .env 配置
AI_PROVIDER=qwen
QWEN_API_KEY=your-qwen-api-key
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1
```

### 4. 文心一言 (百度)
```bash
# .env 配置
AI_PROVIDER=ernie
ERNIE_API_KEY=your-ernie-api-key
ERNIE_SECRET_KEY=your-ernie-secret-key
ERNIE_API_URL=https://aip.baidubce.com
```

### 5. 智谱AI (ChatGLM)
```bash
# .env 配置
AI_PROVIDER=zhipu
ZHIPU_API_KEY=your-zhipu-api-key
ZHIPU_API_URL=https://open.bigmodel.cn/api/paas/v4
```

### 6. 自定义API (兼容OpenAI格式)
```bash
# .env 配置
AI_PROVIDER=custom
CUSTOM_AI_API_KEY=your-api-key
CUSTOM_AI_API_URL=https://api.your-provider.com/v1
CUSTOM_AI_MODEL=your-model-name
```

## API接口使用

### 1. 管理员功能

#### 查看可用的AI提供商
```bash
curl -X GET http://localhost:5000/api/ai/providers \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 切换默认AI提供商
```bash
curl -X POST http://localhost:5000/api/ai/providers/switch \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "qwen"}'
```

#### 测试AI提供商连接
```bash
curl -X POST http://localhost:5000/api/ai/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider": "custom", "testMessage": "你好，请介绍一下自己"}'
```

### 2. 用户功能

#### 智能对话
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我需要准备一个项目演示",
    "provider": "qwen",
    "context": {"department": "技术部"}
  }'
```

#### AI任务规划
```bash
curl -X POST http://localhost:5000/api/ai/task-planning \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskDescription": "准备下周的项目演示，包括PPT制作和环境搭建",
    "deadline": "2025-08-01",
    "provider": "custom"
  }'
```

#### 文档分析
```bash
curl -X POST http://localhost:5000/api/ai/document-analysis \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentContent": "这是一份需要分析的文档内容...",
    "analysisType": "summary",
    "provider": "zhipu"
  }'
```

#### 会议分析
```bash
curl -X POST http://localhost:5000/api/ai/meeting-analysis \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "会议转录内容...",
    "provider": "claude"
  }'
```

## 自定义AI提供商集成

### 1. OpenAI兼容格式
如果您的AI服务提供OpenAI兼容的API格式，直接使用custom配置：

```bash
AI_PROVIDER=custom
CUSTOM_AI_API_KEY=your-api-key
CUSTOM_AI_API_URL=https://your-api.com/v1
CUSTOM_AI_MODEL=your-model
```

### 2. 自定义格式
如果需要支持特殊的API格式，可以在 `aiService.js` 中添加新的调用方法：

```javascript
// 在 callCustom 方法中修改请求格式
async callCustom(prompt, systemPrompt, model, temperature, maxTokens) {
  const response = await axios.post(
    `${this.clients.custom.baseURL}/your-endpoint`,
    {
      // 根据您的API格式调整请求体
      input: prompt,
      system: systemPrompt,
      model: model || this.clients.custom.model,
      temperature,
      max_tokens: maxTokens
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.clients.custom.apiKey}`,
        // 添加其他必要的请求头
      }
    }
  );

  // 根据您的API响应格式调整返回值解析
  return response.data.output || response.data.choices[0].message.content;
}
```

## 配置示例

### 国内AI服务配置示例

#### 使用通义千问
1. 在阿里云控制台创建API Key
2. 配置环境变量：
```bash
AI_PROVIDER=qwen
QWEN_API_KEY=sk-xxx
```

#### 使用智谱AI
1. 在智谱AI开放平台获取API Key
2. 配置环境变量：
```bash
AI_PROVIDER=zhipu
ZHIPU_API_KEY=your-api-key
```

#### 使用文心一言
1. 在百度智能云控制台获取API Key和Secret Key
2. 配置环境变量：
```bash
AI_PROVIDER=ernie
ERNIE_API_KEY=your-api-key
ERNIE_SECRET_KEY=your-secret-key
```

### 海外AI服务配置示例

#### 使用OpenAI
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-3.5-turbo
```

#### 使用Claude
```bash
AI_PROVIDER=claude
CLAUDE_API_KEY=your-claude-api-key
```

## 性能优化建议

### 1. 模型选择
- **任务规划**：推荐使用 `gpt-3.5-turbo`、`qwen-turbo`
- **文档分析**：推荐使用 `claude-3-sonnet`、`glm-4`
- **对话交互**：推荐使用 `gpt-3.5-turbo`、`ernie-3.5`

### 2. 参数调优
```javascript
// 任务规划 - 创意性较高
{ temperature: 0.8, maxTokens: 2000 }

// 文档分析 - 准确性较高
{ temperature: 0.3, maxTokens: 1500 }

// 对话交互 - 平衡创意和准确
{ temperature: 0.6, maxTokens: 800 }
```

### 3. 成本控制
- 使用不同价格档次的模型处理不同复杂度任务
- 设置合理的 `maxTokens` 限制
- 考虑使用缓存减少重复调用

## 故障排除

### 常见错误

#### 1. API Key无效
```
错误: AI服务调用失败: 401 Unauthorized
解决: 检查API Key是否正确配置
```

#### 2. 配额不足
```
错误: AI服务调用失败: 429 Too Many Requests
解决: 检查API配额或升级服务计划
```

#### 3. 网络连接问题
```
错误: AI服务调用失败: ECONNREFUSED
解决: 检查网络连接和API URL配置
```

### 调试方法

1. **测试连接**：使用管理员接口测试AI提供商
2. **查看日志**：检查服务器控制台输出
3. **逐步排查**：从简单的对话测试开始

## 安全建议

1. **API Key保护**：不要将API Key提交到代码仓库
2. **访问控制**：限制API调用频率和用户权限
3. **数据保护**：注意敏感数据不要发送到第三方AI服务
4. **审计日志**：记录AI调用的关键信息用于审计

---

配置完成后，您的智能工作助手就可以使用多种AI大模型为用户提供智能服务了！