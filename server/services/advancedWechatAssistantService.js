/**
 * 高级微信助手服务
 * 实现语音识别、图片处理、智能对话、文件分析等高级功能
 */

const aiService = require('./aiService');
const researchService = require('./enhancedResearchService');
const searchService = require('./intelligentSearchService');
const User = require('../models/User');
const Document = require('../models/Document');
const Task = require('../models/Task');
const Meeting = require('../models/Meeting');
const WechatBinding = require('../models/WechatBinding');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

class AdvancedWechatAssistantService {
  constructor() {
    this.sessionData = new Map(); // 用户会话数据存储
    this.contextMemory = new Map(); // 上下文记忆
  }

  /**
   * 处理语音消息
   * @param {string} openId - 用户OpenID
   * @param {string} mediaId - 语音媒体ID
   * @param {Object} wechatApi - 微信API实例
   */
  async processVoiceMessage(openId, mediaId, wechatApi) {
    try {
      console.log(`🎤 处理语音消息: ${openId}, 媒体ID: ${mediaId}`);

      // 获取语音文件
      const voiceBuffer = await this.downloadWechatMedia(mediaId, wechatApi);
      
      // 保存临时语音文件
      const tempPath = path.join(__dirname, '../uploads/temp', `voice_${Date.now()}.amr`);
      await fs.writeFile(tempPath, voiceBuffer);

      // 语音转文字
      const transcription = await this.speechToText(tempPath);
      
      // 清理临时文件
      await fs.unlink(tempPath).catch(err => console.log('清理临时文件失败:', err));

      if (!transcription || transcription.trim().length === 0) {
        return '🎤 抱歉，语音识别失败，请尝试重新发送或使用文字消息';
      }

      // 处理识别出的文本
      const response = await this.processTextMessage(openId, transcription);
      
      return `🎤 **语音识别结果**\n"${transcription}"\n\n${response}`;

    } catch (error) {
      console.error('处理语音消息失败:', error);
      return '🎤 语音处理失败，请稍后重试或使用文字输入';
    }
  }

  /**
   * 处理图片消息 - OCR识别
   * @param {string} openId - 用户OpenID
   * @param {string} mediaId - 图片媒体ID
   * @param {Object} wechatApi - 微信API实例
   */
  async processImageMessage(openId, mediaId, wechatApi) {
    try {
      console.log(`🖼️ 处理图片消息: ${openId}, 媒体ID: ${mediaId}`);

      // 获取图片文件
      const imageBuffer = await this.downloadWechatMedia(mediaId, wechatApi);
      
      // 保存临时图片文件
      const tempPath = path.join(__dirname, '../uploads/temp', `image_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, imageBuffer);

      // OCR识别
      const ocrText = await this.performOCR(tempPath);
      
      // 清理临时文件
      await fs.unlink(tempPath).catch(err => console.log('清理临时文件失败:', err));

      if (!ocrText || ocrText.trim().length === 0) {
        return '🖼️ 图片中未识别到文字内容\n\n💡 **小贴士**：\n• 确保图片清晰\n• 文字对比度明显\n• 支持中英文识别';
      }

      // 分析识别出的文本
      const analysis = await this.analyzeExtractedText(ocrText);
      
      let response = `🖼️ **图片文字识别结果**\n\n📝 **提取内容**：\n${ocrText}\n\n`;
      
      if (analysis.summary) {
        response += `📊 **内容摘要**：\n${analysis.summary}\n\n`;
      }
      
      if (analysis.keywords && analysis.keywords.length > 0) {
        response += `🔖 **关键词**：${analysis.keywords.join(', ')}\n\n`;
      }
      
      response += '💾 如需保存此内容，请回复"保存文档"';

      // 将OCR结果暂存
      this.setSessionData(openId, 'ocrResult', {
        text: ocrText,
        analysis: analysis,
        timestamp: new Date()
      });

      return response;

    } catch (error) {
      console.error('处理图片消息失败:', error);
      return '🖼️ 图片识别失败，请确保图片清晰并重新发送';
    }
  }

  /**
   * 智能文本消息处理
   * @param {string} openId - 用户OpenID
   * @param {string} text - 用户消息文本
   */
  async processTextMessage(openId, text) {
    try {
      const user = await this.getUserByOpenId(openId);
      if (!user) {
        return '❌ 请先绑定账号，回复"绑定账号"获取绑定码';
      }

      // 意图识别
      const intent = await this.recognizeIntent(text);
      console.log(`🧠 识别意图: ${intent.type} (置信度: ${intent.confidence})`);

      switch (intent.type) {
        case 'task_management':
          return await this.handleTaskManagement(user, text, intent);
        
        case 'document_analysis':
          return await this.handleDocumentAnalysis(user, text, intent);
        
        case 'search_query':
          return await this.handleSearchQuery(user, text, intent);
        
        case 'schedule_management':
          return await this.handleScheduleManagement(user, text, intent);
        
        case 'ai_conversation':
          return await this.handleAIConversation(user, text, intent);
        
        case 'file_operation':
          return await this.handleFileOperation(user, text, intent);
        
        default:
          return await this.handleGeneralQuery(user, text);
      }

    } catch (error) {
      console.error('处理文本消息失败:', error);
      return '❌ 消息处理失败，请稍后重试';
    }
  }

  /**
   * 意图识别
   * @param {string} text - 用户输入文本
   */
  async recognizeIntent(text) {
    const intentPatterns = {
      task_management: [
        /创建任务|添加任务|新建任务|任务规划/,
        /查看任务|任务列表|我的任务|待办事项/,
        /完成任务|更新任务|任务进度/
      ],
      document_analysis: [
        /分析文档|文档分析|解读文件/,
        /文档总结|内容摘要|提取要点/,
        /文档搜索|查找文档|搜索资料/
      ],
      search_query: [
        /搜索|查找|寻找/,
        /相关资料|相关文档|参考资料/
      ],
      schedule_management: [
        /日程|会议|安排|计划/,
        /今天|明天|下周|时间表/,
        /添加事件|创建会议|安排时间/
      ],
      ai_conversation: [
        /AI|人工智能|机器学习|深度学习/,
        /帮我|协助|建议|推荐/,
        /解释|说明|分析|评价/
      ],
      file_operation: [
        /保存|下载|导出/,
        /上传|发送文件|文件处理/
      ]
    };

    // 简单的意图匹配
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return { 
            type: intent, 
            confidence: 0.8,
            matchedPattern: pattern.toString()
          };
        }
      }
    }

    // 使用AI进行更复杂的意图识别
    try {
      const aiIntent = await this.aiIntentRecognition(text);
      return aiIntent;
    } catch (error) {
      console.error('AI意图识别失败:', error);
      return { type: 'general', confidence: 0.5 };
    }
  }

  /**
   * AI意图识别
   * @param {string} text - 用户输入
   */
  async aiIntentRecognition(text) {
    const prompt = `
    请分析用户的意图，从以下类别中选择最匹配的：
    - task_management: 任务管理相关
    - document_analysis: 文档分析相关
    - search_query: 搜索查询相关
    - schedule_management: 日程管理相关
    - ai_conversation: AI对话交流
    - file_operation: 文件操作
    - general: 一般对话

    用户输入："${text}"

    请返回JSON格式：{"type": "类别", "confidence": 0.9, "reasoning": "判断理由"}
    `;

    try {
      const response = await aiService.callAI(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      return JSON.parse(response);
    } catch (error) {
      return { type: 'general', confidence: 0.5, reasoning: '解析失败' };
    }
  }

  /**
   * 处理任务管理相关请求
   */
  async handleTaskManagement(user, text, intent) {
    try {
      if (text.includes('创建') || text.includes('添加') || text.includes('新建')) {
        return await this.createTaskFromText(user, text);
      } 
      
      if (text.includes('查看') || text.includes('列表') || text.includes('我的')) {
        return await this.getTasksList(user);
      }
      
      if (text.includes('完成') || text.includes('更新') || text.includes('进度')) {
        return await this.updateTaskProgress(user, text);
      }

      return await this.getTaskManagementHelp();

    } catch (error) {
      console.error('任务管理处理失败:', error);
      return '❌ 任务管理操作失败，请稍后重试';
    }
  }

  /**
   * 从文本创建任务
   */
  async createTaskFromText(user, text) {
    try {
      const taskAnalysisPrompt = `
      分析用户的任务创建请求，提取任务信息：
      用户输入：${text}
      
      请返回JSON格式：
      {
        "title": "任务标题",
        "description": "任务描述",
        "priority": "high/medium/low",
        "dueDate": "YYYY-MM-DD或null",
        "estimatedHours": 数字或null
      }
      `;

      const aiResponse = await aiService.callAI(taskAnalysisPrompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      const taskInfo = JSON.parse(aiResponse);

      // 创建任务
      const task = await Task.create({
        title: taskInfo.title,
        description: taskInfo.description,
        assignee: user.username,
        priority: taskInfo.priority || 'medium',
        dueDate: taskInfo.dueDate ? new Date(taskInfo.dueDate) : undefined,
        estimatedHours: taskInfo.estimatedHours,
        status: 'pending',
        source: 'wechat'
      });

      return `✅ **任务创建成功**\n\n📋 **${task.title}**\n📝 ${task.description}\n🎯 优先级：${task.priority}\n📅 截止：${task.dueDate ? task.dueDate.toLocaleDateString('zh-CN') : '未设置'}\n\n🔗 任务ID：${task._id.toString().slice(-6)}`;

    } catch (error) {
      console.error('创建任务失败:', error);
      return '❌ 任务创建失败，请尝试更明确地描述任务内容';
    }
  }

  /**
   * 处理文档分析请求
   */
  async handleDocumentAnalysis(user, text, intent) {
    try {
      // 获取用户最近的文档
      const recentDocs = await Document.find({ uploadedBy: user._id })
        .sort({ uploadDate: -1 })
        .limit(5);

      if (recentDocs.length === 0) {
        return '📄 您还没有上传任何文档\n\n🚀 **快速开始**：\n• 直接发送文件到微信\n• 发送图片进行文字识别\n• 访问网页端上传大文件';
      }

      if (text.includes('分析') || text.includes('总结')) {
        // 选择要分析的文档
        const docToAnalyze = await this.selectDocumentForAnalysis(text, recentDocs);
        if (docToAnalyze) {
          return await this.performEnhancedDocumentAnalysis(docToAnalyze);
        }
      }

      // 返回文档列表
      let response = '📄 **您的文档库**\n\n';
      recentDocs.forEach((doc, index) => {
        const icon = this.getFileIcon(doc.fileType);
        response += `${icon} **${doc.originalName}**\n`;
        response += `📅 ${new Date(doc.uploadDate).toLocaleDateString('zh-CN')}\n\n`;
      });

      response += '💡 **使用方式**：\n• 发送"分析 [文档名]"进行深度分析\n• 发送"搜索 [关键词]"查找相关文档';
      
      return response;

    } catch (error) {
      console.error('文档分析处理失败:', error);
      return '❌ 文档分析失败，请稍后重试';
    }
  }

  /**
   * 执行增强文档分析
   */
  async performEnhancedDocumentAnalysis(document) {
    try {
      console.log(`📊 执行增强分析: ${document.originalName}`);

      // 使用增强研究服务进行深度分析
      const analysisResult = await researchService.performDeepDocumentAnalysis(document, {
        includeSemanticAnalysis: true,
        includeTopicModeling: true,
        includeEntityExtraction: true,
        includeRelatedResearch: false, // 微信端不查找外部资源
        language: 'zh'
      });

      // 格式化分析结果用于微信展示
      let response = `📊 **深度分析报告**\n📄 ${document.originalName}\n\n`;

      if (analysisResult.analysis.basic) {
        const basic = analysisResult.analysis.basic;
        response += `📝 **内容摘要**\n${basic.summary || '摘要生成中...'}\n\n`;
        
        if (basic.keywords && basic.keywords.length > 0) {
          response += `🔖 **关键词**\n${basic.keywords.slice(0, 8).join(' • ')}\n\n`;
        }

        if (basic.keyPoints && basic.keyPoints.length > 0) {
          response += `💡 **核心观点**\n`;
          basic.keyPoints.slice(0, 3).forEach((point, index) => {
            response += `${index + 1}. ${point}\n`;
          });
          response += '\n';
        }
      }

      if (analysisResult.analysis.topics && analysisResult.analysis.topics.mainTopics) {
        response += `🎯 **主要主题**\n${analysisResult.analysis.topics.mainTopics.slice(0, 3).join(' • ')}\n\n`;
      }

      if (analysisResult.analysis.entities) {
        const entities = analysisResult.analysis.entities;
        if (entities.entities && entities.entities.length > 0) {
          response += `🏷️ **重要实体**\n`;
          entities.entities.slice(0, 5).forEach(entity => {
            response += `• ${entity.name} (${entity.type})\n`;
          });
        }
      }

      response += `\n⏱️ 分析完成时间：${new Date().toLocaleTimeString('zh-CN')}\n`;
      response += `📱 查看完整报告请访问网页端`;

      return response;

    } catch (error) {
      console.error('增强文档分析失败:', error);
      return `❌ 文档分析失败：${error.message}`;
    }
  }

  /**
   * 处理智能搜索查询
   */
  async handleSearchQuery(user, text, intent) {
    try {
      // 提取搜索关键词
      const query = text.replace(/搜索|查找|寻找/g, '').trim();
      
      if (query.length === 0) {
        return '🔍 请提供搜索关键词\n\n**使用示例**：\n• 搜索 人工智能\n• 查找 项目报告\n• 寻找 会议纪要';
      }

      console.log(`🔍 智能搜索: ${query}`);

      // 使用智能搜索服务
      const searchResults = await searchService.performIntelligentSearch({
        query: query,
        userId: user._id,
        searchType: 'hybrid',
        includeWeb: false, // 微信端只搜索用户文档
        maxResults: 5,
        personalizeResults: true
      });

      if (!searchResults.results || searchResults.results.length === 0) {
        return `🔍 **搜索结果**\n查询: "${query}"\n\n📭 未找到相关内容\n\n💡 **建议**：\n• 尝试不同的关键词\n• 上传更多相关文档\n• 使用同义词搜索`;
      }

      let response = `🔍 **搜索结果**\n查询: "${query}"\n找到 ${searchResults.results.length} 项相关内容\n\n`;

      searchResults.results.forEach((result, index) => {
        const icon = this.getFileIcon(result.fileType);
        response += `${index + 1}. ${icon} **${result.title}**\n`;
        if (result.snippet) {
          response += `📄 ${result.snippet.substring(0, 60)}...\n`;
        }
        response += `💯 相关度: ${(result.score * 100).toFixed(0)}%\n\n`;
      });

      if (searchResults.suggestions && searchResults.suggestions.length > 0) {
        response += `🔗 **相关建议**: ${searchResults.suggestions.slice(0, 3).join(' • ')}`;
      }

      return response;

    } catch (error) {
      console.error('智能搜索失败:', error);
      return '❌ 搜索失败，请稍后重试';
    }
  }

  /**
   * 处理AI对话
   */
  async handleAIConversation(user, text, intent) {
    try {
      // 获取对话上下文
      const context = this.getConversationContext(user._id);
      
      const conversationPrompt = `
      你是一个专业的智能工作助手，正在通过微信为用户提供帮助。
      
      用户背景：${user.username}
      历史上下文：${JSON.stringify(context)}
      用户问题：${text}
      
      请提供专业、有用的回答，控制在200字以内。
      `;

      const aiResponse = await aiService.callAI(conversationPrompt, {
        temperature: 0.7,
        maxTokens: 400,
        systemPrompt: '你是专业的智能工作助手，善于提供实用的建议和帮助。'
      });

      // 更新对话上下文
      this.updateConversationContext(user._id, text, aiResponse);

      return `🤖 **AI助手**\n\n${aiResponse}\n\n💡 有其他问题随时问我！`;

    } catch (error) {
      console.error('AI对话处理失败:', error);
      return '🤖 抱歉，AI助手暂时无法回答您的问题，请稍后重试';
    }
  }

  /**
   * 语音转文字
   * @param {string} audioPath - 音频文件路径
   */
  async speechToText(audioPath) {
    try {
      // 这里应该集成真实的语音识别服务
      // 例如：百度语音识别、阿里云、腾讯云等
      
      // 模拟实现
      console.log('执行语音识别...');
      return '这是模拟的语音识别结果，请帮我创建一个关于项目进展的任务';
      
    } catch (error) {
      console.error('语音识别失败:', error);
      throw error;
    }
  }

  /**
   * OCR文字识别
   * @param {string} imagePath - 图片文件路径
   */
  async performOCR(imagePath) {
    try {
      // 这里应该集成真实的OCR服务
      // 例如：百度OCR、阿里云、腾讯云等
      
      // 模拟实现
      console.log('执行OCR识别...');
      return '这是从图片中识别出的文字内容，包含了重要的技术文档信息';
      
    } catch (error) {
      console.error('OCR识别失败:', error);
      throw error;
    }
  }

  /**
   * 分析提取的文本
   */
  async analyzeExtractedText(text) {
    try {
      const analysisPrompt = `
      请分析以下文本内容，提供摘要和关键词：
      
      ${text}
      
      请返回JSON格式：
      {
        "summary": "内容摘要",
        "keywords": ["关键词1", "关键词2"],
        "category": "内容类别",
        "importance": "high/medium/low"
      }
      `;

      const response = await aiService.callAI(analysisPrompt, {
        temperature: 0.3,
        maxTokens: 300
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('文本分析失败:', error);
      return { summary: '分析失败', keywords: [], category: 'unknown' };
    }
  }

  // 辅助方法
  async downloadWechatMedia(mediaId, wechatApi) {
    // 下载微信媒体文件的实现
    try {
      const mediaInfo = await wechatApi.getMedia(mediaId);
      return mediaInfo.buffer;
    } catch (error) {
      console.error('下载微信媒体失败:', error);
      throw error;
    }
  }

  async getUserByOpenId(openId) {
    try {
      const binding = await WechatBinding.findOne({ wechatOpenid: openId });
      if (!binding) return null;
      
      return await User.findById(binding.userId);
    } catch (error) {
      console.error('获取用户失败:', error);
      return null;
    }
  }

  setSessionData(openId, key, value) {
    if (!this.sessionData.has(openId)) {
      this.sessionData.set(openId, {});
    }
    this.sessionData.get(openId)[key] = value;
  }

  getSessionData(openId, key) {
    const session = this.sessionData.get(openId);
    return session ? session[key] : null;
  }

  getFileIcon(fileType) {
    const icons = {
      'pdf': '📄', 'docx': '📄', 'doc': '📄',
      'xlsx': '📊', 'xls': '📊',
      'pptx': '📈', 'ppt': '📈',
      'txt': '📝', 'md': '📝',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️'
    };
    return icons[fileType?.toLowerCase()] || '📁';
  }

  getConversationContext(userId) {
    return this.contextMemory.get(userId.toString()) || [];
  }

  updateConversationContext(userId, userInput, aiResponse) {
    const context = this.getConversationContext(userId);
    context.push({
      user: userInput,
      ai: aiResponse,
      timestamp: new Date()
    });
    
    // 只保留最近3轮对话
    if (context.length > 3) {
      context.shift();
    }
    
    this.contextMemory.set(userId.toString(), context);
  }
}

module.exports = new AdvancedWechatAssistantService();