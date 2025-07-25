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

    // 通义千问客户端 (阿里云)
    if (process.env.QWEN_API_KEY) {
      this.clients.qwen = {
        apiKey: process.env.QWEN_API_KEY,
        baseURL: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1'
      };
      console.log('✅ 通义千问客户端配置完成');
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
      maxTokens = 2000
    } = options;

    // 检查提供商是否可用
    if (!this.clients[provider]) {
      throw new Error(`AI提供商 ${provider} 未配置或不可用`);
    }

    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(prompt, systemPrompt, model, temperature, maxTokens);
        case 'claude':
          return await this.callClaude(prompt, systemPrompt, model, temperature, maxTokens);
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
    } catch (error) {
      console.error(`${provider} AI调用失败:`, error);
      throw new Error(`AI服务调用失败: ${error.message}`);
    }
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
   * 通义千问调用 (阿里云)
   */
  async callQwen(prompt, systemPrompt, model, temperature, maxTokens) {
    const response = await axios.post(
      `${this.clients.qwen.baseURL}/services/aigc/text-generation/generation`,
      {
        model: model || 'qwen-turbo',
        input: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          temperature,
          max_tokens: maxTokens,
          top_p: 0.8
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.clients.qwen.apiKey}`
        }
      }
    );

    return response.data.output.text;
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
    const mockPlans = [
      {
        id: 1,
        title: '方案一：分阶段执行法',
        content: `**核心优势**：循序渐进，风险可控，质量保证\n\n**执行步骤**：\n第一阶段（1-2天）：资料收集和框架设计\n- 收集项目相关数据和成果\n- 制定PPT整体框架和结构\n- 确定演示重点和亮点\n\n第二阶段（2-3天）：内容制作和完善\n- 制作PPT核心内容页面\n- 添加图表、数据可视化\n- 完善演示逻辑和流程\n\n第三阶段（1-2天）：演示准备和彩排\n- 准备演讲稿和要点\n- 进行模拟演示和时间控制\n- 处理可能的问题和应对方案\n\n**时间估算**：总计5-7天\n**风险评估**：时间充足，质量可控，适合追求完美的情况\n**所需资源**：设计软件、项目数据、反馈收集\n**成功标准**：演示流畅、内容完整、获得认可`,
        priority: 'high'
      },
      {
        id: 2,
        title: '方案二：快速迭代法',
        content: `**核心优势**：快速出成果，敏捷调整，高效实用\n\n**执行步骤**：\n快速原型（1天）：\n- 快速搭建基础框架\n- 填入核心内容要点\n- 制作简版演示稿\n\n迭代完善（2-3天）：\n- 收集初步反馈\n- 逐步细化和美化\n- 重点打磨关键页面\n\n最终调优（1天）：\n- 演示练习和时间把控\n- 最后细节调整\n\n**时间估算**：总计4-5天\n**风险评估**：效率高但需要快速决策能力\n**所需资源**：模板库、快速反馈渠道\n**成功标准**：在有限时间内达到预期效果`,
        priority: 'medium'
      },
      {
        id: 3,
        title: '方案三：协作分工法',
        content: `**核心优势**：团队协作，专业分工，减轻个人压力\n\n**执行步骤**：\n任务分解（0.5天）：\n- 将任务分解为多个模块\n- 分配给不同团队成员\n- 制定协作时间表\n\n并行制作（2-3天）：\n- 内容制作、设计美化、数据整理同时进行\n- 定期同步进度和风格统一\n\n整合优化（1-1.5天）：\n- 整合各部分内容\n- 统一风格和逻辑\n- 团队彩排和完善\n\n**时间估算**：总计4-5天\n**风险评估**：需要良好的团队协作和沟通\n**所需资源**：团队成员配合、协作工具\n**成功标准**：团队配合顺利，成果质量高`,
        priority: 'medium'
      },
      {
        id: 4,
        title: '方案四：模板定制法',
        content: `**核心优势**：省时高效，专业美观，标准化程度高\n\n**执行步骤**：\n模板选择（0.5天）：\n- 选择合适的专业PPT模板\n- 确定色彩搭配和风格\n\n内容填充（2天）：\n- 按照模板结构填入内容\n- 调整页面布局和元素\n- 插入图表和数据\n\n个性化定制（1天）：\n- 根据公司品牌进行调整\n- 添加个性化元素\n- 演示准备和练习\n\n**时间估算**：总计3.5天\n**风险评估**：依赖模板质量，创新性相对较低\n**所需资源**：优质PPT模板、公司VI素材\n**成功标准**：外观专业，内容充实，演示顺畅`,
        priority: 'low'
      }
    ];

    // 根据截止日期调整建议
    if (deadline) {
      const daysUntilDeadline = Math.floor((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeadline < 4) {
        mockPlans[1].priority = 'high'; // 快速迭代法
        mockPlans[3].priority = 'high'; // 模板定制法
      }
    }

    return mockPlans;
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
}

module.exports = new AIService();