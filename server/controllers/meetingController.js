const Meeting = require('../models/Meeting');
const User = require('../models/User');
const AIService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../middleware/errorHandler');
const fs = require('fs').promises;
const path = require('path');
const formData = require('form-data');
const axios = require('axios');
const mime = require('mime-types');

// @desc    获取用户会议列表
// @route   GET /api/meetings
// @access  Private
exports.getMeetings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    startDate,
    endDate,
    search
  } = req.query;

  // 构建查询条件
  const query = {};
  
  // 只显示用户参与的会议
  query.$or = [
    { organizer: req.user._id },
    { 'participants.user': req.user._id }
  ];

  if (status) query.status = status;
  if (type) query.type = type;
  
  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = new Date(startDate);
    if (endDate) query.startTime.$lte = new Date(endDate);
  }

  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    });
  }

  const meetings = await Meeting.find(query)
    .populate('organizer', 'username profile.fullName')
    .populate('participants.user', 'username profile.fullName profile.position')
    .sort({ startTime: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await Meeting.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      meetings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    获取单个会议详情
// @route   GET /api/meetings/:id
// @access  Private
exports.getMeeting = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('organizer', 'username profile.fullName profile.position')
    .populate('participants.user', 'username profile.fullName profile.position')
    .populate('aiAnalysis.personalizedSuggestions.userId', 'username profile.fullName profile.position');

  if (!meeting) {
    return next(new ErrorResponse('会议不存在', 404));
  }

  // 检查用户权限
  const hasAccess = meeting.organizer._id.toString() === req.user._id.toString() ||
                   meeting.participants.some(p => p.user._id.toString() === req.user._id.toString());

  if (!hasAccess) {
    return next(new ErrorResponse('无权访问此会议', 403));
  }

  res.status(200).json({
    success: true,
    data: { meeting }
  });
});

// @desc    创建新会议
// @route   POST /api/meetings
// @access  Private
exports.createMeeting = asyncHandler(async (req, res) => {
  const meetingData = {
    ...req.body,
    organizer: req.user._id
  };

  // 处理参与者数据
  if (req.body.participants) {
    meetingData.participants = req.body.participants.map(p => ({
      user: p.user || p,
      role: p.role || 'participant',
      status: 'invited'
    }));
  }

  const meeting = await Meeting.create(meetingData);
  await meeting.populate('organizer', 'username profile.fullName');

  res.status(201).json({
    success: true,
    message: '会议创建成功',
    data: { meeting }
  });
});

// @desc    上传会议音频
// @route   POST /api/meetings/:id/audio
// @access  Private
exports.uploadAudio = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    return next(new ErrorResponse('会议不存在', 404));
  }

  // 检查权限
  const hasAccess = meeting.organizer.toString() === req.user._id.toString() ||
                   meeting.participants.some(p => p.user.toString() === req.user._id.toString());

  if (!hasAccess) {
    return next(new ErrorResponse('无权上传音频到此会议', 403));
  }

  if (!req.file) {
    return next(new ErrorResponse('请选择音频文件', 400));
  }
  
  console.log('Uploaded file:', req.file); // Debug log

  // 验证文件类型（允许文本文件用于测试）
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'text/plain'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return next(new ErrorResponse('不支持的音频格式', 400));
  }

  // 添加音频文件信息到会议
  const audioFile = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadedBy: req.user._id,
    uploadedAt: new Date()
  };

  meeting.audioFiles.push(audioFile);
  meeting.status = 'completed'; // 上传音频后标记为已完成
  await meeting.save();

  // 自动开始转录和分析
  try {
    await processAudioFile(meeting._id, audioFile);
  } catch (error) {
    console.error('音频处理启动失败:', error);
    // 不阻塞响应，后台继续处理
  }

  res.status(200).json({
    success: true,
    message: '音频文件上传成功，正在处理转录和分析...',
    data: {
      audioFile,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        audioFiles: meeting.audioFiles
      }
    }
  });
});

// @desc    获取会议转录结果
// @route   GET /api/meetings/:id/transcription
// @access  Private
exports.getTranscription = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    return next(new ErrorResponse('会议不存在', 404));
  }

  // 检查权限
  const hasAccess = meeting.organizer.toString() === req.user._id.toString() ||
                   meeting.participants.some(p => p.user.toString() === req.user._id.toString());

  if (!hasAccess) {
    return next(new ErrorResponse('无权访问此会议转录', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      transcription: meeting.transcription,
      status: meeting.transcription?.status || 'pending'
    }
  });
});

// @desc    获取个性化行动清单
// @route   GET /api/meetings/:id/action-items
// @access  Private
exports.getActionItems = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('aiAnalysis.actionItems.assignedTo', 'username profile.fullName profile.position');

  if (!meeting) {
    return next(new ErrorResponse('会议不存在', 404));
  }

  // 检查权限
  const hasAccess = meeting.organizer.toString() === req.user._id.toString() ||
                   meeting.participants.some(p => p.user.toString() === req.user._id.toString());

  if (!hasAccess) {
    return next(new ErrorResponse('无权访问此会议行动项', 403));
  }

  // 获取用户的个性化建议
  const personalizedSuggestion = meeting.aiAnalysis?.personalizedSuggestions?.find(
    ps => ps.userId.toString() === req.user._id.toString()
  );

  // 获取分配给用户的行动项
  const assignedToUser = meeting.aiAnalysis?.actionItems?.filter(
    item => item.assignedTo && item.assignedTo._id.toString() === req.user._id.toString()
  );

  res.status(200).json({
    success: true,
    data: {
      personalizedSuggestions: personalizedSuggestion || null,
      assignedActionItems: assignedToUser || [],
      allActionItems: meeting.aiAnalysis?.actionItems || [],
      analysisStatus: meeting.aiAnalysis?.status || 'pending'
    }
  });
});

// @desc    更新行动项状态
// @route   PUT /api/meetings/:id/action-items/:itemId
// @access  Private
exports.updateActionItem = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id);
  
  if (!meeting) {
    return next(new ErrorResponse('会议不存在', 404));
  }

  const actionItem = meeting.aiAnalysis.actionItems.id(req.params.itemId);
  if (!actionItem) {
    return next(new ErrorResponse('行动项不存在', 404));
  }

  // 只有被分配者或会议组织者可以更新状态
  const canUpdate = actionItem.assignedTo.toString() === req.user._id.toString() ||
                   meeting.organizer.toString() === req.user._id.toString();

  if (!canUpdate) {
    return next(new ErrorResponse('无权更新此行动项', 403));
  }

  // 更新行动项
  if (req.body.completed !== undefined) {
    actionItem.completed = req.body.completed;
    if (req.body.completed) {
      actionItem.completedAt = new Date();
    } else {
      actionItem.completedAt = undefined;
    }
  }

  await meeting.save();

  res.status(200).json({
    success: true,
    message: '行动项状态更新成功',
    data: { actionItem }
  });
});

// @desc    重新分析会议
// @route   POST /api/meetings/:id/reanalyze
// @access  Private
exports.reanalyzeMeeting = asyncHandler(async (req, res, next) => {
  const meeting = await Meeting.findById(req.params.id);

  if (!meeting) {
    return next(new ErrorResponse('会议不存在', 404));
  }

  // 只有组织者可以重新分析
  if (meeting.organizer.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('无权重新分析此会议', 403));
  }

  if (!meeting.transcription || !meeting.transcription.rawText) {
    return next(new ErrorResponse('会议尚未转录，无法分析', 400));
  }

  // 重置分析状态
  meeting.aiAnalysis.status = 'processing';
  meeting.aiAnalysis.analyzedAt = new Date();
  await meeting.save();

  // 开始重新分析
  try {
    await analyzeMeetingContent(meeting._id);
    res.status(200).json({
      success: true,
      message: '重新分析已开始，请稍后查看结果'
    });
  } catch (error) {
    console.error('重新分析启动失败:', error);
    meeting.aiAnalysis.status = 'failed';
    meeting.aiAnalysis.error = error.message;
    await meeting.save();
    
    return next(new ErrorResponse('重新分析启动失败', 500));
  }
});

// 内部函数：处理音频文件
async function processAudioFile(meetingId, audioFile) {
  try {
    console.log(`开始处理会议 ${meetingId} 的音频文件: ${audioFile.filename}`);
    
    const meeting = await Meeting.findById(meetingId)
      .populate('participants.user', 'profile.position profile.fullName');
    
    if (!meeting) {
      throw new Error('会议不存在');
    }

    // 更新转录状态
    meeting.transcription.status = 'processing';
    await meeting.save();

    // 1. 音频转录
    const transcriptionResult = await transcribeAudio(audioFile);
    
    // 更新转录结果
    meeting.transcription = {
      ...meeting.transcription.toObject(),
      rawText: transcriptionResult.text,
      segments: transcriptionResult.segments || [],
      status: 'completed',
      service: 'mock-service',
      language: 'zh-CN',
      processedAt: new Date()
    };
    await meeting.save();

    // 2. AI分析
    await analyzeMeetingContent(meetingId);

    console.log(`会议 ${meetingId} 音频处理完成`);
  } catch (error) {
    console.error(`音频处理失败 (会议 ${meetingId}):`, error);
    
    // 更新错误状态
    const meeting = await Meeting.findById(meetingId);
    if (meeting) {
      meeting.transcription.status = 'failed';
      meeting.transcription.error = error.message;
      meeting.aiAnalysis.status = 'failed';
      meeting.aiAnalysis.error = error.message;
      await meeting.save();
    }
  }
}

// 内部函数：音频转录
async function transcribeAudio(audioFile) {
  try {
    console.log('开始音频转录:', audioFile.filename);
    
    // 这里应该调用真实的语音转录服务
    // 例如：Google Speech-to-Text, Azure Speech Services, 阿里云智能语音等
    
    // 模拟转录结果
    const mockTranscription = {
      text: `各位同事大家好，欢迎参加今天的项目进度会议。首先，让我们回顾一下上周的工作进展。

产品经理汇报：我们已经完成了用户需求调研，收集到了500多份有效反馈。主要需求集中在界面优化和功能扩展两个方面。

技术总监发言：开发团队本周完成了核心模块的开发，目前进度符合预期。预计下周可以开始内测。

市场部经理：市场推广方案已经制定完成，预算控制在50万以内。预计能够覆盖目标用户群体的80%。

大家还有什么问题需要讨论吗？

好的，那我们确定几个行动项：
1. 产品经理负责整理用户反馈，周五前提交优化建议
2. 技术团队继续开发，确保下周内测顺利进行  
3. 市场部准备推广材料，配合产品发布时间
4. 下次会议安排在下周三同一时间

会议结束，谢谢大家。`,
      
      segments: [
        {
          speaker: '会议主持人',
          startTime: 0,
          endTime: 30,
          text: '各位同事大家好，欢迎参加今天的项目进度会议。首先，让我们回顾一下上周的工作进展。',
          confidence: 0.95
        },
        {
          speaker: '产品经理',
          startTime: 35,
          endTime: 65,
          text: '我们已经完成了用户需求调研，收集到了500多份有效反馈。主要需求集中在界面优化和功能扩展两个方面。',
          confidence: 0.92
        },
        {
          speaker: '技术总监',
          startTime: 70,
          endTime: 95,
          text: '开发团队本周完成了核心模块的开发，目前进度符合预期。预计下周可以开始内测。',
          confidence: 0.90
        },
        {
          speaker: '市场部经理',
          startTime: 100,
          endTime: 125,
          text: '市场推广方案已经制定完成，预算控制在50万以内。预计能够覆盖目标用户群体的80%。',
          confidence: 0.88
        }
      ]
    };

    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('音频转录完成');
    return mockTranscription;
  } catch (error) {
    console.error('音频转录失败:', error);
    throw new Error(`音频转录失败: ${error.message}`);
  }
}

// 内部函数：分析会议内容
async function analyzeMeetingContent(meetingId) {
  try {
    console.log(`开始分析会议内容: ${meetingId}`);
    
    const meeting = await Meeting.findById(meetingId)
      .populate('participants.user', 'profile.position profile.fullName username');
    
    if (!meeting || !meeting.transcription.rawText) {
      throw new Error('转录内容不存在');
    }

    // 更新分析状态
    meeting.aiAnalysis.status = 'processing';
    await meeting.save();

    // 调用AI服务进行分析
    const analysisResult = await AIService.analyzeMeeting({
      title: meeting.title,
      transcription: meeting.transcription.rawText,
      participants: meeting.participants,
      type: meeting.type,
      duration: meeting.duration
    });

    // 生成个性化建议
    const personalizedSuggestions = await generatePersonalizedSuggestions(
      meeting, 
      analysisResult
    );

    // 更新分析结果
    meeting.aiAnalysis = {
      ...meeting.aiAnalysis.toObject(),
      summary: analysisResult.summary,
      keyPoints: analysisResult.keyPoints,
      decisions: analysisResult.decisions,
      actionItems: analysisResult.actionItems,
      personalizedSuggestions: personalizedSuggestions,
      topics: analysisResult.topics,
      sentiment: analysisResult.sentiment,
      status: 'completed',
      analyzedAt: new Date()
    };

    await meeting.save();
    console.log(`会议内容分析完成: ${meetingId}`);
    
  } catch (error) {
    console.error(`会议分析失败 (${meetingId}):`, error);
    
    const meeting = await Meeting.findById(meetingId);
    if (meeting) {
      meeting.aiAnalysis.status = 'failed';
      meeting.aiAnalysis.error = error.message;
      await meeting.save();
    }
    throw error;
  }
}

// 内部函数：生成个性化建议
async function generatePersonalizedSuggestions(meeting, analysisResult) {
  const suggestions = [];
  
  for (const participant of meeting.participants) {
    if (!participant.user) continue;
    
    const userPosition = participant.user.profile?.position || '员工';
    const userName = participant.user.profile?.fullName || participant.user.username;
    
    // 根据职位生成不同的建议
    let personalizedAdvice = [];
    let actionItems = [];
    let followUpItems = [];
    
    switch (userPosition.toLowerCase()) {
      case '经理':
      case '主管':
      case 'manager':
        personalizedAdvice = [
          '关注团队成员的工作进度和资源需求',
          '确保项目里程碑按时完成',
          '协调跨部门合作事项'
        ];
        actionItems = analysisResult.actionItems
          .filter(item => item.priority === 'high')
          .map(item => item.content);
        break;
        
      case '产品经理':
      case 'pm':
      case '产品':
        personalizedAdvice = [
          '整理用户反馈并制定产品优化方案',
          '跟踪产品开发进度',
          '准备下一阶段的产品路线图'
        ];
        break;
        
      case '技术总监':
      case 'cto':
      case '开发':
      case '程序员':
        personalizedAdvice = [
          '评估技术方案的可行性和风险',
          '确保代码质量和架构稳定性',
          '安排技术团队的任务分配'
        ];
        break;
        
      case '市场':
      case '营销':
      case 'marketing':
        personalizedAdvice = [
          '制定推广策略和预算计划',
          '分析目标用户群体',
          '准备市场推广材料'
        ];
        break;
        
      default:
        personalizedAdvice = [
          '按时完成分配的工作任务',
          '及时反馈工作中的问题',
          '积极参与团队协作'
        ];
    }
    
    // 从会议决策中提取相关的跟进事项
    followUpItems = analysisResult.decisions
      .filter(decision => decision.decidedBy === userName || decision.decidedBy.includes(userPosition))
      .map(decision => `跟进决策：${decision.decision}`)
      .slice(0, 3);

    suggestions.push({
      userId: participant.user._id,
      position: userPosition,
      suggestions: personalizedAdvice,
      actionItems: actionItems.slice(0, 3),
      followUpItems: followUpItems
    });
  }
  
  return suggestions;
}

// All functions are already exported via exports.functionName above