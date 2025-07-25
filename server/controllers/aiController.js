const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 获取可用的AI提供商列表
 * @route   GET /api/ai/providers
 * @access  Private (Admin)
 */
const getProviders = asyncHandler(async (req, res) => {
  const providers = aiService.getAvailableProviders();
  
  res.status(200).json({
    success: true,
    message: '获取AI提供商列表成功',
    data: {
      providers,
      currentDefault: aiService.defaultProvider,
      totalAvailable: providers.filter(p => p.available).length
    }
  });
});

/**
 * 切换默认AI提供商
 * @route   POST /api/ai/providers/switch
 * @access  Private (Admin)
 */
const switchProvider = asyncHandler(async (req, res) => {
  const { provider } = req.body;

  if (!provider) {
    return res.status(400).json({
      success: false,
      message: '请提供AI提供商名称'
    });
  }

  try {
    aiService.setDefaultProvider(provider);
    
    res.status(200).json({
      success: true,
      message: `成功切换至${provider}`,
      data: {
        newDefault: provider,
        previousDefault: aiService.defaultProvider
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 测试AI提供商连接
 * @route   POST /api/ai/test
 * @access  Private (Admin)
 */
const testProvider = asyncHandler(async (req, res) => {
  const { provider, testMessage = '你好，请简单介绍一下自己。' } = req.body;

  const options = provider ? { provider } : {};

  try {
    const startTime = Date.now();
    const response = await aiService.callAI(testMessage, {
      ...options,
      systemPrompt: '你是一个AI助手，请简洁地回答用户问题。',
      maxTokens: 100
    });
    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: 'AI提供商测试成功',
      data: {
        provider: provider || aiService.defaultProvider,
        testMessage,
        response,
        responseTime: `${responseTime}ms`,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('AI提供商测试失败:', error);
    res.status(500).json({
      success: false,
      message: `AI提供商测试失败: ${error.message}`,
      data: {
        provider: provider || aiService.defaultProvider,
        testMessage,
        error: error.message
      }
    });
  }
});

/**
 * 智能对话接口
 * @route   POST /api/ai/chat
 * @access  Private
 */
const chat = asyncHandler(async (req, res) => {
  const { message, provider, context = {} } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      message: '请提供对话消息'
    });
  }

  // 添加用户信息到上下文
  const userContext = {
    ...context,
    username: req.user.username,
    position: req.user.profile?.position,
    department: req.user.profile?.department
  };

  const options = provider ? { provider } : {};

  try {
    const response = await aiService.processIntelligentMessage(message, userContext, options);

    res.status(200).json({
      success: true,
      data: {
        message: response,
        provider: provider || aiService.defaultProvider,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('智能对话处理失败:', error);
    res.status(500).json({
      success: false,
      message: `对话处理失败: ${error.message}`
    });
  }
});

/**
 * 任务规划生成接口
 * @route   POST /api/ai/task-planning
 * @access  Private
 */
const generateTaskPlanning = asyncHandler(async (req, res) => {
  const { taskDescription, deadline, provider } = req.body;

  if (!taskDescription) {
    return res.status(400).json({
      success: false,
      message: '请提供任务描述'
    });
  }

  const userPosition = req.user.profile?.position || '员工';
  const options = provider ? { provider } : {};

  try {
    const plans = await aiService.generateTaskPlanning(
      taskDescription,
      userPosition,
      deadline,
      options
    );

    res.status(200).json({
      success: true,
      message: `成功生成${plans.length}个任务规划方案`,
      data: {
        plans,
        taskDescription,
        userPosition,
        deadline,
        provider: provider || aiService.defaultProvider,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('任务规划生成失败:', error);
    res.status(500).json({
      success: false,
      message: `任务规划生成失败: ${error.message}`
    });
  }
});

/**
 * 文档分析接口
 * @route   POST /api/ai/document-analysis
 * @access  Private
 */
const analyzeDocument = asyncHandler(async (req, res) => {
  const { documentContent, analysisType = 'summary', provider } = req.body;

  if (!documentContent) {
    return res.status(400).json({
      success: false,
      message: '请提供文档内容'
    });
  }

  const options = provider ? { provider } : {};

  try {
    const analysis = await aiService.analyzeDocument(
      documentContent,
      analysisType,
      options
    );

    res.status(200).json({
      success: true,
      message: '文档分析完成',
      data: {
        ...analysis,
        provider: provider || aiService.defaultProvider,
        analysisType,
        originalLength: documentContent.length
      }
    });
  } catch (error) {
    console.error('文档分析失败:', error);
    res.status(500).json({
      success: false,
      message: `文档分析失败: ${error.message}`
    });
  }
});

/**
 * 会议分析接口
 * @route   POST /api/ai/meeting-analysis
 * @access  Private
 */
const analyzeMeeting = asyncHandler(async (req, res) => {
  const { transcription, provider } = req.body;

  if (!transcription) {
    return res.status(400).json({
      success: false,
      message: '请提供会议转录内容'
    });
  }

  const userPosition = req.user.profile?.position || '员工';
  const options = provider ? { provider } : {};

  try {
    const analysis = await aiService.analyzeMeetingTranscription(
      transcription,
      userPosition,
      options
    );

    res.status(200).json({
      success: true,
      message: '会议分析完成',
      data: {
        ...analysis,
        userPosition,
        provider: provider || aiService.defaultProvider,
        transcriptionLength: transcription.length
      }
    });
  } catch (error) {
    console.error('会议分析失败:', error);
    res.status(500).json({
      success: false,
      message: `会议分析失败: ${error.message}`
    });
  }
});

/**
 * 批量AI处理接口
 * @route   POST /api/ai/batch
 * @access  Private (Admin)
 */
const batchProcess = asyncHandler(async (req, res) => {
  const { tasks, provider } = req.body;

  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({
      success: false,
      message: '请提供任务数组'
    });
  }

  const options = provider ? { provider } : {};
  const results = [];

  try {
    for (const task of tasks) {
      const { type, data } = task;
      let result;

      switch (type) {
        case 'chat':
          result = await aiService.processIntelligentMessage(data.message, data.context || {}, options);
          break;
        case 'task-planning':
          result = await aiService.generateTaskPlanning(data.taskDescription, data.userPosition, data.deadline, options);
          break;
        case 'document-analysis':
          result = await aiService.analyzeDocument(data.documentContent, data.analysisType, options);
          break;
        case 'meeting-analysis':
          result = await aiService.analyzeMeetingTranscription(data.transcription, data.userPosition, options);
          break;
        default:
          throw new Error(`不支持的任务类型: ${type}`);
      }

      results.push({
        taskId: task.id || results.length,
        type,
        success: true,
        result
      });
    }

    res.status(200).json({
      success: true,
      message: `批量处理完成，共处理${tasks.length}个任务`,
      data: {
        results,
        provider: provider || aiService.defaultProvider,
        processedAt: new Date()
      }
    });
  } catch (error) {
    console.error('批量AI处理失败:', error);
    res.status(500).json({
      success: false,
      message: `批量处理失败: ${error.message}`,
      data: {
        results,
        failedAt: results.length
      }
    });
  }
});

module.exports = {
  getProviders,
  switchProvider,
  testProvider,
  chat,
  generateTaskPlanning,
  analyzeDocument,
  analyzeMeeting,
  batchProcess
};