/**
 * 多模型AI服务类
 * 支持OpenAI、Claude、通义千问、文心一言等多种大模型
 */

// 导入不同的AI客户端
const axios = require('axios');

class AIService {
  constructor() {
    // 当前使用的AI提供商，可通过环境变量配置
    this.defaultProvider = process.env.AI_PROVIDER || 'openai';
    
    // 初始化各种AI客户端
    this.clients = {};
    this.initializeClients();
  }

  /**
   * 初始化各种AI客户端
   */
  initializeClients() {
    // OpenAI客户端
    if (process.env.OPENAI_API_KEY) {
      try {
        const { OpenAI } = require('openai');
        this.clients.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          organization: process.env.OPENAI_ORGANIZATION
        });
        console.log('✅ OpenAI客户端初始化成功');
      } catch (error) {
        console.log('⚠️  OpenAI客户端初始化失败:', error.message);
      }
    }

    // Claude客户端 (Anthropic)
    if (process.env.CLAUDE_API_KEY) {
      this.clients.claude = {
        apiKey: process.env.CLAUDE_API_KEY,
        baseURL: process.env.CLAUDE_API_URL || 'https://api.anthropic.com'
      };
      console.log('✅ Claude客户端配置完成');
    }

    // 通义千问客户端 (阿里云DashScope)
    if (process.env.QWEN_API_KEY) {
      this.clients.qwen = {
        apiKey: process.env.QWEN_API_KEY,
        baseURL: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1',
        model: process.env.QWEN_MODEL || 'qwen-turbo'
      };
      console.log('✅ 通义千问客户端配置完成');
      console.log(`   模型: ${this.clients.qwen.model}`);
      console.log(`   API地址: ${this.clients.qwen.baseURL}`);
    }

    // PPIO派欧云平台客户端
    if (process.env.PPIO_API_KEY) {
      this.clients.ppio = {
        apiKey: process.env.PPIO_API_KEY,
        baseURL: process.env.PPIO_API_URL || 'https://api.ppio.cloud/v1',
        model: process.env.PPIO_MODEL || 'gpt-3.5-turbo'
      };
      console.log('✅ PPIO派欧云平台客户端配置完成');
      console.log(`   模型: ${this.clients.ppio.model}`);
      console.log(`   API地址: ${this.clients.ppio.baseURL}`);
    }

    // 文心一言客户端 (百度)
    if (process.env.ERNIE_API_KEY && process.env.ERNIE_SECRET_KEY) {
      this.clients.ernie = {
        apiKey: process.env.ERNIE_API_KEY,
        secretKey: process.env.ERNIE_SECRET_KEY,
        baseURL: process.env.ERNIE_API_URL || 'https://aip.baidubce.com'
      };
      console.log('✅ 文心一言客户端配置完成');
    }

    // 智谱AI (ChatGLM)
    if (process.env.ZHIPU_API_KEY) {
      this.clients.zhipu = {
        apiKey: process.env.ZHIPU_API_KEY,
        baseURL: process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4'
      };
      console.log('✅ 智谱AI客户端配置完成');
    }

    // 自定义API客户端
    if (process.env.CUSTOM_AI_API_KEY) {
      this.clients.custom = {
        apiKey: process.env.CUSTOM_AI_API_KEY,
        baseURL: process.env.CUSTOM_AI_API_URL,
        model: process.env.CUSTOM_AI_MODEL || 'default'
      };
      console.log('✅ 自定义AI客户端配置完成');
    }
  }

  /**
   * 统一的AI调用接口
   * @param {string} prompt 提示词
   * @param {Object} options 配置选项
   * @returns {Promise<string>} AI回复
   */
  async callAI(prompt, options = {}) {
    const {
      provider = this.defaultProvider,
      systemPrompt = '你是一个专业的AI助手。',
      model = null,
      temperature = 0.7,
      maxTokens = 2000,
      timeout = 15000 // 15秒超时
    } = options;

    // 优先级列表：指定provider -> qwen -> openai -> mock
    const providerPriority = [provider, 'qwen', 'openai', 'mock'];
    
    for (const currentProvider of providerPriority) {
      try {
        console.log(`🤖 尝试使用 ${currentProvider} 进行AI调用...`);
        
        let result;
        if (currentProvider === 'mock') {
          console.log('⚠️  使用模拟AI响应');
          result = await this.getMockResponse(prompt, systemPrompt);
        } else {
          // 检查提供商是否可用
          if (!this.clients[currentProvider]) {
            throw new Error(`AI提供商 ${currentProvider} 未配置或不可用`);
          }
          
          // 添加超时控制
          result = await Promise.race([
            this.callProviderAPI(currentProvider, prompt, systemPrompt, model, temperature, maxTokens),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('请求超时')), timeout)
            )
          ]);
        }
        
        console.log(`✅ ${currentProvider} AI调用成功`);
        return result;
        
      } catch (error) {
        console.error(`❌ ${currentProvider} AI调用失败:`, error.message);
        
        // 如果是超时或网络错误，快速切换到下一个provider
        if (error.message.includes('超时') || error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
          console.log(`⚡ ${currentProvider} 超时，快速切换到下一个服务...`);
          continue;
        }
        
        // 如果不是最后一个provider，继续尝试
        if (currentProvider !== providerPriority[providerPriority.length - 1]) {
          continue;
        }
        
        // 最后一个provider也失败了，抛出错误
        throw error;
      }
    }
  }

  /**
   * 调用具体的AI提供商API
   */
  async callProviderAPI(provider, prompt, systemPrompt, model, temperature, maxTokens) {
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(prompt, systemPrompt, model, temperature, maxTokens);
      case 'claude':
        return await this.callClaude(prompt, systemPrompt, model, temperature, maxTokens);
      case 'ppio':
        return await this.callPPIO(prompt, systemPrompt, model, temperature, maxTokens);
      case 'qwen':
        return await this.callQwen(prompt, systemPrompt, model, temperature, maxTokens);
      case 'ernie':
        return await this.callErnie(prompt, systemPrompt, model, temperature, maxTokens);
      case 'zhipu':
        return await this.callZhipu(prompt, systemPrompt, model, temperature, maxTokens);
      case 'custom':
        return await this.callCustom(prompt, systemPrompt, model, temperature, maxTokens);
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }

  /**
   * 获取模拟AI响应
   */
  async getMockResponse(prompt, systemPrompt = '') {
    // 模拟响应延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 根据不同的提示词类型返回不同的模拟响应
    if (prompt.includes('任务规划') || prompt.includes('task planning') || prompt.includes('工作安排')) {
      return JSON.stringify({
        plans: [
          {
            title: '方案一：敏捷开发模式',
            description: '采用敏捷开发方法，分阶段迭代实现，快速响应变化',
            timeline: '预计5个工作日',
            priority: 'high',
            resources: '团队5人，中等预算',
            steps: ['需求分析', '原型设计', '开发实现', '测试验证', '部署上线'],
            advantages: ['开发周期短', '灵活性高', '可快速调整']
          },
          {
            title: '方案二：MVP优先模式',
            description: '优先开发核心功能，快速验证可行性，逐步完善',
            timeline: '预计3个工作日',
            priority: 'medium',
            resources: '团队3人，低预算',
            steps: ['核心功能识别', '快速开发', '用户测试', '反馈优化'],
            advantages: ['成本控制', '风险低', '快速交付']
          },
          {
            title: '方案三：全面规划模式',
            description: '制定详细计划，确保功能完整性和系统稳定性',
            timeline: '预计7个工作日',
            priority: 'low',
            resources: '团队8人，高预算',
            steps: ['详细调研', '技术选型', '架构设计', '功能开发', '全面测试', '文档编写', '正式发布'],
            advantages: ['功能完整', '质量稳定', '可维护性高']
          }
        ],
        recommendation: '针对当前项目情况，建议采用方案一（敏捷开发模式），在保证质量的同时提高开发效率。',
        considerations: ['团队资源配置和技能匹配', '时间约束和进度追踪', '质量要求和测试覆盖', '风险控制和应急预案']
      });
    }
    
    if (prompt.includes('文档分析') || prompt.includes('document analysis')) {
      return '基于文档内容分析，主要论点包括：1. 核心概念和定义；2. 关键数据和统计；3. 重要结论和建议。[此为模拟AI分析结果]';
    }
    
    if (prompt.includes('会议') || prompt.includes('meeting')) {
      return '会议纪要：主要讨论了项目进展和下一步计划。行动项：1. 完成技术方案评估；2. 更新项目时间线；3. 组织下次团队会议。[此为模拟会议分析结果]';
    }
    
    return `这是一个模拟的AI响应。为了获得更好的AI体验，请配置有效的AI服务API密钥。\n\n原始请求: ${prompt}`;
  }

  /**
   * OpenAI调用
   */
  async callOpenAI(prompt, systemPrompt, model, temperature, maxTokens) {
    const response = await this.clients.openai.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature,
      max_tokens: maxTokens
    });

    return response.choices[0].message.content;
  }

  /**
   * Claude调用 (Anthropic)
   */
  async callClaude(prompt, systemPrompt, model, temperature, maxTokens) {
    const response = await axios.post(
      `${this.clients.claude.baseURL}/v1/messages`,
      {
        model: model || 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.clients.claude.apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  }

  /**
   * PPIO派欧云平台调用
   * 使用Bearer认证方式，兼容OpenAI API格式
   */
  async callPPIO(prompt, systemPrompt, model, temperature, maxTokens) {
    try {
      const response = await axios.post(
        `${this.clients.ppio.baseURL}/chat/completions`,
        {
          model: model || process.env.PPIO_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: temperature || 0.7,
          max_tokens: maxTokens || 2000,
          top_p: 0.9,
          frequency_penalty: 0,
          presence_penalty: 0
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.clients.ppio.apiKey}`
          }
        }
      );

      // 处理PPIO的响应格式 (兼容OpenAI)
      if (response.data && response.data.choices && response.data.choices[0]) {
        return response.data.choices[0].message?.content || response.data.choices[0].text || '抱歉，PPIO AI服务暂时无法响应。';
      }
      
      throw new Error('PPIO API响应格式异常');
    } catch (error) {
      console.error('PPIO API调用失败:', error.response?.data || error.message);
      
      // 检查是否是API密钥错误
      if (error.response?.status === 401) {
        console.warn('⚠️  PPIO API密钥无效或过期，将使用模拟响应');
        // 在开发环境下，如果API密钥无效，返回模拟数据
        if (process.env.NODE_ENV === 'development') {
          return '抱歉，PPIO派欧云平台API密钥需要正确配置。请检查API密钥是否有效、是否具有足够的调用额度。此文本为模拟响应。';
        }
      }
      
      // 其他错误处理
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 429) {
          throw new Error(`PPIO API调用频率过高 (${status}): 请稍后重试`);
        } else if (status === 400) {
          throw new Error(`PPIO API请求参数错误 (${status}): ${errorData?.error?.message || '参数错误'}`);
        } else {
          throw new Error(`PPIO API错误 (${status}): ${errorData?.error?.message || errorData?.message || '未知错误'}`);
        }
      }
      
      throw new Error(`PPIO服务调用失败: ${error.message}`);
    }
  }

  /**
   * 通义千问调用 (阿里云DashScope)
   */
  async callQwen(prompt, systemPrompt, model, temperature, maxTokens) {
    try {
      const response = await axios.post(
        `${this.clients.qwen.baseURL}/services/aigc/text-generation/generation`,
        {
          model: model || process.env.QWEN_MODEL || 'qwen-turbo',
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ]
          },
          parameters: {
            temperature: temperature || 0.7,
            max_tokens: maxTokens || 2000,
            top_p: 0.8,
            result_format: 'text'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.clients.qwen.apiKey}`,
            'X-DashScope-SSE': 'disable'
          }
        }
      );

      // 处理通义千问的响应格式
      if (response.data && response.data.output) {
        return response.data.output.text || response.data.output.choices?.[0]?.message?.content || '抱歉，AI服务暂时无法响应。';
      }
      
      throw new Error('通义千问API响应格式异常');
    } catch (error) {
      console.error('通义千问API调用失败:', error.response?.data || error.message);
      
      // 检查是否是API密钥错误
      if (error.response?.status === 401 || error.response?.data?.code === 'InvalidApiKey') {
        console.warn('⚠️  通义千问API密钥无效，将使用模拟响应');
        // 在开发环境下，如果API密钥无效，返回模拟数据
        if (process.env.NODE_ENV === 'development') {
          return '抱歉，通义千问API密钥需要正确配置。请检查API密钥是否有效、是否具有足够的调用额度，并确认已开通相关服务。此文本为模拟响应。';
        }
      }
      
      // 如果是网络错误或API错误，抛出具体错误信息
      if (error.response) {
        throw new Error(`通义千问API错误 (${error.response.status}): ${error.response.data?.message || error.response.data?.code || '未知错误'}`);
      }
      
      throw new Error(`通义千问服务调用失败: ${error.message}`);
    }
  }

  /**
   * 文心一言调用 (百度)
   */
  async callErnie(prompt, systemPrompt, model, temperature, maxTokens) {
    // 先获取access_token
    const tokenResponse = await axios.post(
      `${this.clients.ernie.baseURL}/oauth/2.0/token`,
      null,
      {
        params: {
          grant_type: 'client_credentials',
          client_id: this.clients.ernie.apiKey,
          client_secret: this.clients.ernie.secretKey
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 调用文心一言API
    const response = await axios.post(
      `${this.clients.ernie.baseURL}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${model || 'completions'}`,
      {
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${prompt}` }
        ],
        temperature,
        max_output_tokens: maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          access_token: accessToken
        }
      }
    );

    return response.data.result;
  }

  /**
   * 智谱AI调用 (ChatGLM)
   */
  async callZhipu(prompt, systemPrompt, model, temperature, maxTokens) {
    const response = await axios.post(
      `${this.clients.zhipu.baseURL}/chat/completions`,
      {
        model: model || 'glm-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clients.zhipu.apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * 自定义API调用
   */
  async callCustom(prompt, systemPrompt, model, temperature, maxTokens) {
    const response = await axios.post(
      `${this.clients.custom.baseURL}/chat/completions`,
      {
        model: model || this.clients.custom.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clients.custom.apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  /**
   * 任务规划 - 生成多个工作安排建议
   * @param {string} taskDescription 任务描述
   * @param {string} userPosition 用户职位
   * @param {string} deadline 截止日期
   * @param {Object} options 配置选项
   * @returns {Promise<Array>} 返回3个以上的规划方案
   */
  async generateTaskPlanning(taskDescription, userPosition = '员工', deadline = null, options = {}) {
    // 如果是Mock模式，直接返回改进后的模拟数据
    if (this.defaultProvider === 'mock') {
      console.log('Mock模式: 使用改进的任务规划数据');
      return this.generateMockTaskPlanning(taskDescription, userPosition, deadline);
    }
    
    const prompt = this.buildTaskPlanningPrompt(taskDescription, userPosition, deadline);
    const systemPrompt = '你是一个专业的工作规划助手，擅长为不同职位的用户制定高效的工作计划。请生成3-4个不同的实施方案，每个方案都要详细具体。';

    try {
      const response = await this.callAI(prompt, {
        ...options,
        systemPrompt,
        temperature: 0.8,
        maxTokens: 2000
      });

      return this.parseTaskPlanningResponse(response);
    } catch (error) {
      console.error('任务规划AI服务错误:', error);
      
      // 返回模拟数据作为演示
      console.log('使用模拟数据替代AI响应');
      return this.generateMockTaskPlanning(taskDescription, userPosition, deadline);
    }
  }

  /**
   * 文档分析服务
   * @param {string} documentContent 文档内容
   * @param {string} analysisType 分析类型
   * @param {Object} options 配置选项
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeDocument(documentContent, analysisType = 'summary', options = {}) {
    const prompt = this.buildDocumentAnalysisPrompt(documentContent, analysisType);
    const systemPrompt = '你是一个专业的文档分析师，能够快速提取关键信息并生成结构化的分析报告。';

    try {
      const response = await this.callAI(prompt, {
        ...options,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1500
      });

      return this.parseDocumentAnalysis(response, analysisType);
    } catch (error) {
      console.error('文档分析AI服务错误:', error);
      
      // 返回模拟数据作为演示
      console.log('使用模拟数据替代AI响应');
      return this.generateMockDocumentAnalysis(documentContent, analysisType);
    }
  }

  /**
   * 会议内容综合分析
   * @param {Object} meetingData 会议数据
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeMeeting(meetingData) {
    const { title, transcription, participants, type, duration } = meetingData;
    
    const prompt = this.buildMeetingAnalysisPrompt(meetingData);
    const systemPrompt = '你是一个专业的会议分析师，能够提取关键信息、总结要点、识别决策并生成行动项。';

    try {
      const response = await this.callAI(prompt, {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 2000
      });

      return this.parseMeetingAnalysis(response, meetingData);
    } catch (error) {
      console.error('会议分析AI服务错误:', error);
      // 使用模拟数据作为后备
      return this.generateMockMeetingAnalysis(meetingData);
    }
  }

  /**
   * 会议音频转录分析
   * @param {string} transcription 转录文本
   * @param {string} userPosition 用户职位
   * @param {Object} options 配置选项
   * @returns {Promise<Object>} 个性化行动清单
   */
  async analyzeMeetingTranscription(transcription, userPosition, options = {}) {
    const prompt = this.buildMeetingAnalysisPrompt({ transcription, userPosition });
    const systemPrompt = '你是一个专业的会议分析师，能够根据用户职位生成个性化的行动清单。';

    try {
      const response = await this.callAI(prompt, {
        ...options,
        systemPrompt,
        temperature: 0.4,
        maxTokens: 1500
      });

      return this.parseMeetingAnalysis(response);
    } catch (error) {
      console.error('会议分析AI服务错误:', error);
      // 使用模拟数据作为后备
      return this.generateMockMeetingAnalysis({ transcription, userPosition });
    }
  }

  /**
   * 任务计划执行服务
   * @param {string} taskId 任务ID
   * @param {number} planIndex 计划索引
   * @param {string} userPosition 用户职位
   * @param {string} customRequirements 自定义需求
   * @param {Object} options 配置选项
   * @returns {Promise<Object>} 执行结果
   */
  async executePlan(taskId, planIndex, userPosition, customRequirements = '', options = {}) {
    // 如果是Mock模式，直接返回模拟数据
    if (this.defaultProvider === 'mock') {
      console.log('Mock模式: 使用模拟任务执行数据');
      return this.generateMockPlanExecution(taskId, planIndex, userPosition, customRequirements);
    }
    
    const prompt = this.buildPlanExecutionPrompt(taskId, planIndex, userPosition, customRequirements);
    const systemPrompt = '你是一个专业的任务执行管理器，能够根据用户计划生成详细的执行结果和进度报告。';

    try {
      const response = await this.callAI(prompt, {
        ...options,
        systemPrompt,
        temperature: 0.5,
        maxTokens: 1500
      });

      return this.parsePlanExecutionResponse(response, taskId, planIndex);
    } catch (error) {
      console.error('任务执行 AI服务错误:', error);
      
      // 返回模拟数据作为演示
      console.log('使用模拟数据替代AI响应');
      return this.generateMockPlanExecution(taskId, planIndex, userPosition, customRequirements);
    }
  }

  /**
   * 智能对话处理
   * @param {string} message 用户消息
   * @param {Object} userContext 用户上下文
   * @param {Object} options 配置选项
   * @returns {Promise<string>} AI回复
   */
  async processIntelligentMessage(message, userContext = {}, options = {}) {
    const prompt = this.buildIntelligentMessagePrompt(message, userContext);
    const systemPrompt = '你是一个智能工作助手，能够理解用户意图并提供专业的建议和帮助。回答要简洁明了，重点突出。';

    try {
      return await this.callAI(prompt, {
        ...options,
        systemPrompt,
        temperature: 0.6,
        maxTokens: 800
      });
    } catch (error) {
      console.error('智能对话AI服务错误:', error);
      return '抱歉，我暂时无法理解您的问题，请稍后再试。';
    }
  }

  /**
   * 获取可用的AI提供商列表
   */
  getAvailableProviders() {
    return Object.keys(this.clients).map(provider => ({
      name: provider,
      available: !!this.clients[provider],
      isDefault: provider === this.defaultProvider
    }));
  }

  /**
   * 切换默认AI提供商
   */
  setDefaultProvider(provider) {
    if (!this.clients[provider]) {
      throw new Error(`AI提供商 ${provider} 不可用`);
    }
    this.defaultProvider = provider;
    console.log(`默认AI提供商已切换至: ${provider}`);
  }

  /**
   * 生成模拟文档分析（当AI服务不可用时）
   */
  generateMockDocumentAnalysis(documentContent, analysisType) {
    const wordCount = documentContent.split(/\s+/).length;
    const sentences = documentContent.split(/[.!。!？]/).filter(s => s.trim().length > 0);
    const firstSentences = sentences.slice(0, 3).join('。');
    
    const mockAnalyses = {
      summary: {
        type: 'summary',
        summary: `本文档包含约${wordCount}个词汇，${sentences.length}个句子。主要内容涵盖了关键业务信息和相关数据。\n\n文档开头部分：${firstSentences.substring(0, 200)}...\n\n总体结构清晰，信息组织有序，具有较好的可读性。建议遵循文档中的关键指导原则。`,
        generatedAt: new Date(),
        wordCount
      },
      keywords: {
        type: 'keywords',
        summary: `从文档中提取的主要关键词如下：\n\n• 项目管理\n• 业务流程\n• 数据分析\n• 解决方案\n• 技术实施\n• 质量控制\n• 团队协作\n• 时间节点\n\n这些关键词反映了文档的核心主题和重点关注领域。`,
        generatedAt: new Date(),
        wordCount
      },
      insights: {
        type: 'insights',
        summary: `通过深入分析，该文档呈现以下洞察：\n\n**优势分析**：\n• 文档结构合理，逻辑清晰\n• 信息覆盖面广，内容详实\n• 具有实用性和可操作性\n\n**改进建议**：\n• 可考虑增加更多视觉化元素\n• 建议添加更多具体案例\n• 可以进一步细化实施步骤\n\n**关键行动项**：\n• 按照文档指导制定详细计划\n• 定期跟踪进度和效果\n• 及时调整和优化方案`,
        generatedAt: new Date(),
        wordCount
      },
      action_items: {
        type: 'action_items',
        summary: `基于文档内容识别出以下行动项：\n\n**立即行动**：\n• 阅读并理解文档核心内容\n• 确认所有利益相关者都已收到文档\n• 设置项目进度跟踪机制\n\n**短期目标**：\n• 制定详细的实施时间表\n• 分配相关资源和人员\n• 建立质量检查标准\n\n**长期规划**：\n• 定期评估和更新文档内容\n• 收集反馈并持续改进\n• 将经验总结应用到未来项目`,
        generatedAt: new Date(),
        wordCount
      }
    };
    
    return mockAnalyses[analysisType] || mockAnalyses.summary;
  }

  /**
   * 生成模拟任务规划（当AI服务不可用时）
   */
  generateMockTaskPlanning(taskDescription, userPosition, deadline) {
    // 根据任务描述生成更具针对性的规划
    const taskType = this.identifyTaskType(taskDescription);
    const mockPlans = this.generateSpecificPlans(taskDescription, userPosition, deadline, taskType);
    
    return mockPlans;
  }

  /**
   * 识别任务类型
   */
  identifyTaskType(taskDescription) {
    const desc = taskDescription.toLowerCase();
    
    if (desc.includes('开发') || desc.includes('编程') || desc.includes('系统') || desc.includes('模块')) {
      return 'development';
    } else if (desc.includes('设计') || desc.includes('ui') || desc.includes('界面')) {
      return 'design';
    } else if (desc.includes('分析') || desc.includes('研究') || desc.includes('调研')) {
      return 'research';
    } else if (desc.includes('文档') || desc.includes('方案') || desc.includes('报告')) {
      return 'documentation';
    } else if (desc.includes('会议') || desc.includes('演示') || desc.includes('ppt')) {
      return 'presentation';
    }
    
    return 'general';
  }

  /**
   * 根据任务类型生成具体规划
   */
  generateSpecificPlans(taskDescription, userPosition, deadline, taskType) {
    const basePlans = {
      development: [
        {
          id: 1,
          title: '方案一：敏捷开发法',
          content: `**适用任务**：${taskDescription}\n\n**执行策略**：\n第1周：需求分析和技术设计\n- 细化功能需求和用户故事\n- 设计数据库结构和API接口\n- 初始化项目代码仓库\n\n第2-3周：核心功能开发\n- 搭建基础架构和环境\n- 开发核心业务逻辑\n- 实现基本的CRUD操作\n\n第4周：测试和优化\n- 编写单元测试和集成测试\n- 性能优化和代码重构\n- 部署到测试环境\n\n**时间估算**：4周\n**技术栈**：Node.js + React + MongoDB\n**风险控制**：每周进行代码审查和功能演示`,
          priority: 'high'
        },
        {
          id: 2,
          title: '方案二：分模块开发法',
          content: `**适用任务**：${taskDescription}\n\n**执行策略**：\n阶段1：用户管理模块（1.5周）\n- 用户注册、登录、身份验证\n- 用户信息管理和权限控制\n\n阶段2：数据管理模块（2周）\n- 数据增删改查功能\n- 数据验证和安全控制\n\n阶段3：界面集成（0.5周）\n- 前端组件集成\n- 接口联调和测试\n\n**时间估算**：4周\n**优势**：可并行开发，风险分散`,
          priority: 'medium'
        },
        {
          id: 3,
          title: '方案三：MVP快速原型法',
          content: `**适用任务**：${taskDescription}\n\n**执行策略**：\n周1：最小可行产品\n- 只开发核心功能\n- 简化界面和流程\n- 快速部署和测试\n\n周2-3：用户反馈迭代\n- 收集用户反馈\n- 优先级排序功能需求\n- 快速迭代开发\n\n周4：完善和优化\n- 功能完善和细节优化\n- 性能和稳定性提升\n\n**时间估算**：4周\n**优势**：快速交付，及时获取反馈`,
          priority: 'medium'
        }
      ],
      
      general: [
        {
          id: 1,
          title: '方案一：分阶段执行法',
          content: `**适用任务**：${taskDescription}\n\n**执行策略**：\n第一阶段（1-2天）：调研和准备\n- 收集相关资料和信息\n- 分析任务要求和目标\n- 制定详细执行计划\n\n第二阶段（2-3天）：核心执行\n- 按计划逐步执行任务\n- 定期检查进度和质量\n- 及时调整和优化\n\n第三阶段（1-2天）：总结和交付\n- 检查成果质量\n- 整理和总结经验\n- 正式交付成果\n\n**时间估算**：4-7天\n**风险控制**：每个阶段都有检查点`,
          priority: 'high'
        },
        {
          id: 2,
          title: '方案二：快速执行法',
          content: `**适用任务**：${taskDescription}\n\n**执行策略**：\n快速分析（0.5-1天）：\n- 快速理解任务要求\n- 确定优先级和关键路径\n\n集中执行（2-3天）：\n- 专注最重要的部分\n- 快速迭代和调整\n- 及时解决问题\n\n快速交付（0.5-1天）：\n- 简化流程和测试\n- 形成可用成果\n\n**时间估算**：3-5天\n**优势**：快速出结果，适合紧急任务`,
          priority: 'medium'
        },
        {
          id: 3,
          title: '方案三：协作分工法',
          content: `**适用任务**：${taskDescription}\n\n**执行策略**：\n任务分解（0.5天）：\n- 将任务分解为独立模块\n- 分配给不同成员\n- 制定协作规则\n\n并行执行（3-4天）：\n- 各模块同时进行\n- 定期同步和沟通\n- 统一标准和质量\n\n整合交付（1天）：\n- 整合各部分成果\n- 统一测试和优化\n\n**时间估算**：4.5-5.5天\n**优势**：发挥团队优势，提高效率`,
          priority: 'medium'
        }
      ]
    };

    // 根据任务类型返回对应的规划
    let selectedPlans = basePlans[taskType] || basePlans.general;
    
    // 根据截止日期调整优先级
    if (deadline) {
      const daysUntilDeadline = Math.floor((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeadline < 4) {
        selectedPlans.forEach(plan => {
          if (plan.id === 2) plan.priority = 'high'; // 快速方法
        });
      }
    }
    
    return selectedPlans.map(plan => ({
      ...plan,
      taskDescription,
      userPosition,
      deadline,
      generatedAt: new Date().toISOString()
    }));
  }

  /**
   * 获取模拟响应（为了演示效果）
   */
  async getMockResponse(prompt, systemPrompt) {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (prompt.includes('任务规划') || prompt.includes('工作计划')) {
      return '为您准备了3个实用的任务规划方案，详细如下：\n\n1. **敏捷开发法**: 适合大多数技术项目\n2. **快速迭代法**: 适合紧急项目和原型开发\n3. **分模块开发法**: 适合复杂项目和团队协作';
    }
    
    if (prompt.includes('文档分析') || prompt.includes('内容分析')) {
      return '文档分析结果：\n\n**摘要**: 这是一份关于产品开发的重要文档。\n**关键点**: 用户需求、技术规范、开发时间表。\n**建议**: 建议优先关注核心功能开发。';
    }
    
    if (prompt.includes('会议分析') || prompt.includes('转录')) {
      return '会议分析结果：\n\n**会议摘要**: 团队讨论了项目进展情况。\n**关键决策**: 确定下周交付计划。\n**行动项**: 1.完成用户模块开发 2.准备测试用例';
    }
    
    return '抱歉，当前AI服务暂时不可用。请稍后重试或联系管理员。这是一个模拟响应用于演示。';
  }





  /**
   * 构建会议分析提示词
   */
  buildMeetingAnalysisPrompt(meetingData) {
    const { title, transcription, participants, type, duration } = meetingData;
    
    let participantsList = '';
    if (participants && participants.length > 0) {
      participantsList = participants.map(p => 
        `${p.user?.profile?.fullName || p.user?.username || '未知'} (${p.user?.profile?.position || '员工'})`
      ).join('、');
    }

    return `请分析以下会议内容并提供结构化分析：

会议标题：${title || '未命名会议'}
会议类型：${type || 'meeting'}
会议时长：${duration ? duration + '分钟' : '未知'}
参会人员：${participantsList || '未知'}

会议转录内容：
${transcription}

请提供以下分析：
1. 会议摘要（200字以内）
2. 关键讨论点（3-5个要点）
3. 重要决策（如果有的话）
4. 行动项和负责人
5. 主要话题分析
6. 整体情感倾向

请以JSON格式返回结果。`;
  }

  /**
   * 解析会议分析结果
   */
  parseMeetingAnalysis(response, meetingData = {}) {
    try {
      // 尝试解析JSON响应
      const parsed = JSON.parse(response);
      return parsed;
    } catch (error) {
      // 如果解析失败，使用文本解析
      return this.parseTextMeetingAnalysis(response, meetingData);
    }
  }

  /**
   * 文本格式会议分析解析
   */
  parseTextMeetingAnalysis(text, meetingData = {}) {
    const analysis = {
      summary: '',
      keyPoints: [],
      decisions: [],
      actionItems: [],
      topics: [],
      sentiment: { overall: 'neutral', byParticipant: [] }
    };

    // 提取摘要
    const summaryMatch = text.match(/摘要[：:](.*?)(?=\n.*[：:]|$)/s);
    if (summaryMatch) {
      analysis.summary = summaryMatch[1].trim();
    }

    // 提取关键点
    const keyPointsMatch = text.match(/关键讨论点[：:](.*?)(?=\n.*[：:]|$)/s);
    if (keyPointsMatch) {
      analysis.keyPoints = keyPointsMatch[1]
        .split(/[\n•·\-]/)
        .filter(point => point.trim())
        .map(point => point.trim());
    }

    return analysis;
  }

  /**
   * 生成模拟会议分析（当AI服务不可用时）
   */
  generateMockMeetingAnalysis(meetingData) {
    const { title, transcription, participants, type } = meetingData;
    
    return {
      summary: `本次${type === 'meeting' ? '会议' : '讨论'}围绕"${title || '项目进展'}"展开，参与者就相关事项进行了深入讨论。会议涉及多个重要议题，包括工作进展汇报、问题解决方案讨论以及后续行动计划制定。各参与者积极发言，提出了建设性意见和建议。`,
      
      keyPoints: [
        '各部门工作进展情况良好，基本符合预期时间节点',
        '识别出几个需要重点关注的风险点和挑战',
        '确定了下一阶段的主要工作重点和方向',
        '明确了各团队成员的具体职责分工'
      ],
      
      decisions: [
        {
          decision: '确定项目下一阶段的时间节点和里程碑',
          decidedBy: '项目负责人',
          context: '基于当前进度和资源情况',
          timestamp: new Date()
        },
        {
          decision: '调整部分工作流程以提高效率',
          decidedBy: '团队主管',
          context: '针对发现的瓶颈问题',
          timestamp: new Date()
        }
      ],
      
      actionItems: [
        {
          content: '完成项目阶段性总结报告',
          assignedToName: '项目经理',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
          category: '项目管理'
        },
        {
          content: '更新项目风险评估文档',
          assignedToName: '风险管理专员',
          priority: 'medium',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后
          category: '风险管理'
        },
        {
          content: '安排下次团队协调会议',
          assignedToName: '团队助理',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
          category: '会议安排'
        }
      ],
      
      topics: [
        {
          topic: '项目进度汇报',
          importance: 'high',
          timeSpent: 15,
          participants: participants?.map(p => p.user?.profile?.fullName || p.user?.username).filter(Boolean) || ['参会者']
        },
        {
          topic: '问题解决讨论',
          importance: 'high',
          timeSpent: 12,
          participants: participants?.map(p => p.user?.profile?.fullName || p.user?.username).filter(Boolean) || ['参会者']
        },
        {
          topic: '下一步计划制定',
          importance: 'medium',
          timeSpent: 8,
          participants: participants?.map(p => p.user?.profile?.fullName || p.user?.username).filter(Boolean) || ['参会者']
        }
      ],
      
      sentiment: {
        overall: 'positive',
        byParticipant: participants?.map(p => ({
          participant: p.user?.profile?.fullName || p.user?.username || '未知参与者',
          sentiment: 'positive',
          confidence: 0.75
        })) || []
      }
    };
  }

  // 以下是私有方法，保持原有逻辑不变

  // 私有方法：构建任务规划提示词
  buildTaskPlanningPrompt(taskDescription, userPosition, deadline) {
    return `
作为${userPosition}，我需要完成以下任务：
${taskDescription}

${deadline ? `截止日期：${deadline}` : ''}

请为我生成3-4个不同的工作安排方案，每个方案应包括：
1. 方案名称和核心优势
2. 具体的执行步骤（分阶段）
3. 时间估算和里程碑
4. 风险评估和应对措施
5. 所需资源和团队配合
6. 成功标准和验收要点

请确保方案适合我的职位级别，并提供实用可行的建议。
`;
  }

  // 私有方法：构建文档分析提示词
  buildDocumentAnalysisPrompt(documentContent, analysisType) {
    const prompts = {
      summary: `请对以下文档进行总结分析，提取关键信息：\n\n${documentContent}`,
      keywords: `请从以下文档中提取关键词和重要概念：\n\n${documentContent}`,
      insights: `请分析以下文档，提供深入的洞察和建议：\n\n${documentContent}`,
      action_items: `请从以下文档中识别出需要采取的行动项：\n\n${documentContent}`
    };
    
    return prompts[analysisType] || prompts.summary;
  }

  // 私有方法：构建会议分析提示词
  buildMeetingAnalysisPrompt(transcription, userPosition) {
    return `
我是一名${userPosition}，参加了以下会议：

会议内容：
${transcription}

请根据我的职位特点，为我生成个性化的行动清单，包括：
1. 我需要立即执行的高优先级任务
2. 需要跟进和协调的事项
3. 需要准备的材料和资源
4. 与相关人员的沟通要点
5. 时间节点和截止日期
6. 风险点和注意事项

请确保建议符合我的职责范围和权限级别，并按优先级排序。
`;
  }

  // 私有方法：构建智能对话提示词
  buildIntelligentMessagePrompt(message, userContext) {
    const { username, position, department } = userContext;
    
    return `
用户信息：
- 姓名：${username || '用户'}
- 职位：${position || '员工'}
- 部门：${department || '未知'}

用户消息：${message}

请理解用户意图，并提供专业、有用的回复。如果涉及具体业务建议，请考虑用户的职位级别。回答要简洁明了，重点突出。
`;
  }

  // 私有方法：解析任务规划响应
  parseTaskPlanningResponse(content) {
    try {
      const plans = [];
      const sections = content.split(/方案\s*[一二三四1234]|Plan\s*[1234]/);
      
      sections.slice(1).forEach((section, index) => {
        plans.push({
          id: index + 1,
          title: `方案${index + 1}`,
          content: section.trim(),
          priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
        });
      });

      return plans.length > 0 ? plans : [{
        id: 1,
        title: '建议方案',
        content: content,
        priority: 'medium'
      }];
    } catch (error) {
      console.error('解析任务规划响应失败:', error);
      return [{
        id: 1,
        title: 'AI生成方案',
        content: content,
        priority: 'medium'
      }];
    }
  }

  // 私有方法：解析文档分析结果
  parseDocumentAnalysis(content, analysisType) {
    return {
      type: analysisType,
      summary: content,
      generatedAt: new Date(),
      wordCount: content.length
    };
  }

  // 私有方法：解析会议分析结果
  parseMeetingAnalysis(content) {
    return {
      actionItems: this.extractActionItems(content),
      summary: content,
      generatedAt: new Date()
    };
  }

  // 私有方法：提取行动项
  extractActionItems(content) {
    const actionItems = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.match(/^\d+\.|\-|\*/) && line.length > 10) {
        actionItems.push({
          id: index,
          content: line.replace(/^\d+\.|\-|\*\s*/, ''),
          priority: 'medium',
          completed: false
        });
      }
    });

    return actionItems;
  }

  // 私有方法：构建任务执行提示词
  buildPlanExecutionPrompt(taskId, planIndex, userPosition, customRequirements) {
    return `
我是一名${userPosition}，需要执行编号为 ${taskId} 的任务的第 ${planIndex + 1} 个执行计划。

${customRequirements ? `特殊需求：${customRequirements}` : ''}

请生成详细的执行结果，包括：
1. 执行概述和整体结果
2. 分步骤执行过程和输出
3. 遇到的问题和解决方案
4. 实际完成时间和质量评估
5. 后续建议和改进方向

请确保结果真实可信，符合我的职位特点。
`;
  }

  // 私有方法：解析任务执行响应
  parsePlanExecutionResponse(content, taskId, planIndex) {
    try {
      // 提取执行步骤
      const steps = this.extractExecutionSteps(content);
      
      return {
        executionId: `exec_${taskId}_${planIndex}_${Date.now()}`,
        status: 'completed',
        startTime: new Date(Date.now() - 300000).toISOString(), // 5分钟前开始
        endTime: new Date().toISOString(),
        progress: 100,
        currentStep: steps.length,
        summary: this.extractExecutionSummary(content),
        outputs: steps
      };
    } catch (error) {
      console.error('解析任务执行响应失败:', error);
      return this.generateMockPlanExecution(taskId, planIndex, 'AI用户', '');
    }
  }

  // 私有方法：提取执行步骤
  extractExecutionSteps(content) {
    const steps = [];
    const lines = content.split('\n');
    let stepIndex = 0;
    
    lines.forEach((line, index) => {
      if (line.match(/^\s*[\d一二三四五]\.|\s*步骤|\s*阶段/)) {
        const cleanLine = line.replace(/^\s*[\d一二三四五]\.|\s*步骤\s*[\d一二三四五]\s*[:：]?|\s*阶段\s*[\d一二三四五]\s*[:：]?/g, '').trim();
        
        if (cleanLine.length > 5) {
          const timestamp = new Date(Date.now() - (steps.length * 60000)).toISOString(); // 每步间隔6分钟
          steps.push({
            stepIndex: stepIndex++,
            stepName: `步骤${stepIndex}`,
            output: cleanLine,
            timestamp: timestamp,
            status: 'completed'
          });
        }
      }
    });

    // 如果没有提取到步骤，生成默认步骤
    if (steps.length === 0) {
      const defaultSteps = ['开始执行任务', '处理核心工作', '完成任务并验收'];
      defaultSteps.forEach((step, index) => {
        steps.push({
          stepIndex: index,
          stepName: `步骤${index + 1}`,
          output: step,
          timestamp: new Date(Date.now() - ((defaultSteps.length - index - 1) * 60000)).toISOString(),
          status: 'completed'
        });
      });
    }

    return steps;
  }

  // 私有方法：提取执行摘要
  extractExecutionSummary(content) {
    // 提取第一段或前100个字作为摘要
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    if (lines.length > 0) {
      return lines[0].substring(0, 100) + (lines[0].length > 100 ? '...' : '');
    }
    return '任务执行完成，所有步骤已按计划完成。';
  }

  // 私有方法：生成模拟任务执行数据
  generateMockPlanExecution(taskId, planIndex, userPosition, customRequirements) {
    const executionTemplates = [
      {
        summary: '任务执行完成，实际用时比预期减少20%，质量符合标准。',
        steps: [
          { name: '项目启动', output: '完成项目启动会议，明确了项目目标和时间表，组建了核心团队' },
          { name: '需求分析', output: '深入研究用户需求，识别了关键功能点，完成了功能规格文档' },
          { name: '方案实施', output: '按照计划步骤执行，各项工作进展顺利，完成了既定目标' },
          { name: '质量验收', output: '通过全面测试和评审，确认交付物符合质量标准，用户反馈良好' }
        ]
      },
      {
        summary: '项目执行过程中遇到了一些挑战，但通过团队努力和灵活调整，最终成功完成。',
        steps: [
          { name: '初始化阶段', output: '完成环境搭建和基础配置，为后续工作做好准备' },
          { name: '开发阶段', output: '按照计划完成开发任务，期间解决了几个技术难点' },
          { name: '测试阶段', output: '进行了充分的测试，及时修复了发现的问题' },
          { name: '上线部署', output: '成功上线并运行稳定，获得了预期的业务价值' }
        ]
      }
    ];

    const template = executionTemplates[planIndex % executionTemplates.length];
    const baseTime = Date.now();
    
    return {
      executionId: `mock_exec_${taskId}_${planIndex}_${Date.now()}`,
      status: 'completed',
      startTime: new Date(baseTime - 3600000).toISOString(), // 1小时前开始
      endTime: new Date(baseTime).toISOString(),
      progress: 100,
      currentStep: template.steps.length,
      summary: template.summary + (customRequirements ? ` 根据特殊需求（${customRequirements}）进行了相应调整。` : ''),
      outputs: template.steps.map((step, index) => ({
        stepIndex: index,
        stepName: step.name,
        output: step.output + (userPosition !== '员工' ? `（结合${userPosition}职责特点进行了优化）` : ''),
        timestamp: new Date(baseTime - ((template.steps.length - index) * 300000)).toISOString(), // 每步间5分钟
        status: 'completed'
      }))
    };
  }
}

module.exports = new AIService();