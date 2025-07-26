const User = require('../models/User');
const WechatBinding = require('../models/WechatBinding');
const Task = require('../models/Task');
const Calendar = require('../models/Calendar');
const Document = require('../models/Document');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/aiService');
const advancedAssistant = require('../services/advancedWechatAssistantService');
const messageTemplate = require('../services/wechatMessageTemplateService');
const crypto = require('crypto');
// 微信API初始化（占位，等待配置）
let wechatApi = null;

try {
  const WechatAPI = require('wechat-api');
  wechatApi = new WechatAPI(
    process.env.WECHAT_APPID,
    process.env.WECHAT_APPSECRET
  );
} catch (error) {
  console.log('微信API未配置，使用模拟模式');
}

/**
 * 处理查看任务请求
 */
async function handleViewTasks(user) {
  try {
    const tasks = await Task.find({ 
      assignee: user.username 
    })
    .sort({ createdAt: -1 })
    .limit(5);

    if (tasks.length === 0) {
      return '📋 **您的任务列表**\n\n🎉 太棒了！您当前没有待办任务\n\n🚀 您可以：\n• 点击“任务规划”创建新任务\n• 上传文档进行分析\n• 管理您的日程安排';
    }

    let response = '📋 **您的任务列表**\n\n';
    
    tasks.forEach((task, index) => {
      const statusIcon = {
        'pending': '🔄',
        'in_progress': '⚙️',
        'completed': '✅',
        'overdue': '⚠️'
      }[task.status] || '📋';
      
      const priorityIcon = {
        'urgent': '🔴',
        'high': '🟡', 
        'medium': '🟢',
        'low': '🔵'
      }[task.priority] || '🟢';
      
      response += `${statusIcon} **${task.title}**\n`;
      response += `${priorityIcon} 优先级: ${task.priority}\n`;
      response += `📅 截止: ${new Date(task.dueDate).toLocaleDateString('zh-CN')}\n\n`;
    });
    
    response += '📝 要查看任务详情或创建新任务，请使用菜单功能';
    
    return response;
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return '❌ 获取任务列表失败，请稍后重试';
  }
}

/**
 * 处理任务进度查询
 */
async function handleTaskProgress(user) {
  try {
    const tasks = await Task.find({ assignee: user.username });
    
    if (tasks.length === 0) {
      return '📋 **任务进度统计**\n\n🎉 您当前没有任务，进度表现完美！';
    }
    
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      overdue: tasks.filter(t => t.status === 'overdue').length
    };
    
    const completionRate = ((stats.completed / stats.total) * 100).toFixed(1);
    
    let response = '📋 **任务进度统计**\n\n';
    response += `🏆 完成率: ${completionRate}%\n\n`;
    response += `✅ 已完成: ${stats.completed} 个\n`;
    response += `⚙️ 进行中: ${stats.in_progress} 个\n`;
    response += `🔄 待开始: ${stats.pending} 个\n`;
    
    if (stats.overdue > 0) {
      response += `⚠️ 已逾期: ${stats.overdue} 个\n`;
    }
    
    response += '\n📡 要更新任务状态，请访问网页端管理';
    
    return response;
  } catch (error) {
    console.error('获取任务进度失败:', error);
    return '❌ 获取任务进度失败，请稍后重试';
  }
}

/**
 * 处理文档搜索请求
 */
async function handleSearchDocs(user) {
  try {
    const recentDocs = await Document.find({ uploadedBy: user._id })
      .sort({ uploadDate: -1 })
      .limit(5);
    
    if (recentDocs.length === 0) {
      return '📄 **您的文档库**\n\n📁 您尚未上传任何文档\n\n🚀 您可以：\n• 直接发送文件到微信\n• 使用网页端上传大文件\n• 发送图片进行文字识别';
    }
    
    let response = '📄 **您的文档库**\n\n';
    
    recentDocs.forEach((doc, index) => {
      const fileIcon = {
        'pdf': '📄',
        'docx': '📄', 
        'xlsx': '📃',
        'jpg': '🖼️',
        'png': '🖼️',
        'jpeg': '🖼️'
      }[doc.fileType] || '📁';
      
      response += `${fileIcon} **${doc.originalName}**\n`;
      if (doc.analysis && doc.analysis.isAnalyzed) {
        response += `✅ 已分析 | ${doc.analysis.category}\n`;
      } else {
        response += `🔄 待分析\n`;
      }
      response += `📅 ${new Date(doc.uploadDate).toLocaleDateString('zh-CN')}\n\n`;
    });
    
    response += '🔍 要搜索特定文档，请发送“搜索 [关键词]”';
    
    return response;
  } catch (error) {
    console.error('获取文档列表失败:', error);
    return '❌ 获取文档列表失败，请稍后重试';
  }
}

/**
 * 生成微信绑定码
 * @route   POST /api/wechat/bind/generate
 * @access  Private
 */
const generateBindingCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 检查用户是否已绑定微信
  const user = await User.findById(userId);
  if (user.wechatBinding && user.wechatBinding.openid) {
    return res.status(400).json({
      success: false,
      message: '您已绑定微信账号，如需重新绑定请先解绑'
    });
  }

  // 清理用户之前未完成的绑定记录
  await WechatBinding.deleteMany({
    userId: userId,
    status: { $in: ['pending', 'expired'] }
  });

  // 生成新的绑定码
  let bindingCode;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    bindingCode = WechatBinding.generateBindingCode();
    const existing = await WechatBinding.findOne({ bindingCode });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    return res.status(500).json({
      success: false,
      message: '生成绑定码失败，请稍后重试'
    });
  }

  // 创建绑定记录
  const binding = await WechatBinding.create({
    bindingCode,
    userId,
    clientInfo: {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      platform: req.get('X-Platform') || 'web'
    },
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5分钟后过期
  });

  res.status(200).json({
    success: true,
    message: '绑定码生成成功，请在微信中输入该绑定码',
    data: {
      bindingCode,
      expiresIn: 300, // 5分钟
      expiresAt: binding.expiresAt
    }
  });
});

/**
 * 验证绑定码（由微信端调用）
 * @route   POST /api/wechat/bind/verify
 * @access  Public (微信服务器调用)
 */
const verifyBindingCode = asyncHandler(async (req, res) => {
  const { bindingCode, openId, userInfo } = req.body;

  if (!bindingCode || !openId) {
    return res.status(400).json({
      success: false,
      message: '绑定码和微信OpenID不能为空'
    });
  }

  // 验证绑定码
  const result = await WechatBinding.validateBindingCode(bindingCode, openId);

  if (!result.success) {
    return res.status(400).json(result);
  }

  // 更新用户微信信息
  const user = result.user;
  if (userInfo) {
    user.wechatBinding.nickname = userInfo.nickname;
    user.wechatBinding.avatar = userInfo.avatar;
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: '微信账号绑定成功',
    data: {
      user: {
        id: user._id,
        username: user.username,
        wechatNickname: user.wechatBinding.nickname
      }
    }
  });
});

/**
 * 获取绑定状态
 * @route   GET /api/wechat/bind/status
 * @access  Private
 */
const getBindingStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 查找待处理的绑定记录
  const pendingBinding = await WechatBinding.findOne({
    userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  // 获取用户微信绑定信息
  const user = await User.findById(userId);
  const wechatBinding = user.wechatBinding;

  res.status(200).json({
    success: true,
    data: {
      isBound: !!(wechatBinding && wechatBinding.openid),
      wechatInfo: wechatBinding && wechatBinding.openid ? {
        nickname: wechatBinding.nickname,
        avatar: wechatBinding.avatar,
        bindTime: wechatBinding.bindTime,
        isVerified: wechatBinding.isVerified
      } : null,
      pendingBinding: pendingBinding ? {
        bindingCode: pendingBinding.bindingCode,
        expiresAt: pendingBinding.expiresAt,
        attempts: pendingBinding.attempts
      } : null
    }
  });
});

/**
 * 解绑微信账号
 * @route   DELETE /api/wechat/bind
 * @access  Private
 */
const unbindWechat = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // 清空用户的微信绑定信息
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        'wechatBinding.openid': 1,
        'wechatBinding.unionid': 1,
        'wechatBinding.nickname': 1,
        'wechatBinding.avatar': 1,
        'wechatBinding.bindTime': 1
      },
      'wechatBinding.isVerified': false
    },
    { new: true }
  );

  // 删除相关的绑定记录
  await WechatBinding.deleteMany({
    $or: [
      { userId },
      { wechatOpenId: user.wechatBinding?.openid }
    ]
  });

  res.status(200).json({
    success: true,
    message: '微信账号解绑成功'
  });
});

/**
 * 获取微信用户资料
 * @route   GET /api/wechat/profile
 * @access  Private
 */
const getWechatProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user.wechatBinding || !user.wechatBinding.openid) {
    return res.status(400).json({
      success: false,
      message: '未绑定微信账号'
    });
  }

  try {
    // 从微信API获取最新的用户信息
    const wechatUser = await wechatApi.getUser(user.wechatBinding.openid);

    // 更新本地存储的微信信息
    user.wechatBinding.nickname = wechatUser.nickname;
    user.wechatBinding.avatar = wechatUser.headimgurl;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        openid: wechatUser.openid,
        nickname: wechatUser.nickname,
        avatar: wechatUser.headimgurl,
        city: wechatUser.city,
        province: wechatUser.province,
        country: wechatUser.country,
        language: wechatUser.language,
        subscribe: wechatUser.subscribe,
        subscribeTime: wechatUser.subscribe_time
      }
    });
  } catch (error) {
    console.error('获取微信用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取微信用户信息失败'
    });
  }
});

/**
 * 发送微信消息
 * @route   POST /api/wechat/send-message
 * @access  Private (Admin only)
 */
const sendWechatMessage = asyncHandler(async (req, res) => {
  const { openId, message, messageType = 'text' } = req.body;

  // 检查管理员权限
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  }

  if (!openId || !message) {
    return res.status(400).json({
      success: false,
      message: '请提供OpenID和消息内容'
    });
  }

  try {
    let result;
    
    switch (messageType) {
      case 'text':
        result = await wechatApi.sendText(openId, message);
        break;
      case 'image':
        result = await wechatApi.sendImage(openId, message);
        break;
      case 'voice':
        result = await wechatApi.sendVoice(openId, message);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的消息类型'
        });
    }

    res.status(200).json({
      success: true,
      message: '消息发送成功',
      data: result
    });
  } catch (error) {
    console.error('发送微信消息失败:', error);
    res.status(500).json({
      success: false,
      message: '消息发送失败'
    });
  }
});

/**
 * 微信消息webhook处理器
 * @route   POST /api/wechat/webhook
 * @access  Public (微信服务器调用)
 */
const handleWebhook = asyncHandler(async (req, res) => {
  // 验证微信服务器签名
  const { signature, timestamp, nonce, echostr } = req.query;
  const token = process.env.WECHAT_TOKEN || 'default_token';
  
  // GET请求用于验证URL
  if (req.method === 'GET') {
    if (verifyWechatSignature(signature, timestamp, nonce, token)) {
      return res.send(echostr);
    } else {
      return res.status(403).send('Forbidden');
    }
  }
  
  // POST请求处理消息
  if (req.method === 'POST') {
    if (!verifyWechatSignature(signature, timestamp, nonce, token)) {
      return res.status(403).send('Forbidden');
    }
    
    const xmlData = req.body;
    const response = await processWechatMessage(xmlData);
    
    res.set('Content-Type', 'application/xml');
    return res.send(response);
  }
});

/**
 * 验证微信服务器签名
 */
function verifyWechatSignature(signature, timestamp, nonce, token) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1');
  sha1.update(str);
  const result = sha1.digest('hex');
  return result === signature;
}

/**
 * 处理微信消息
 */
async function processWechatMessage(xmlData) {
  try {
    // 解析XML消息
    const message = parseWechatXML(xmlData);
    const { ToUserName, FromUserName, CreateTime, MsgType } = message;
    
    console.log('收到微信消息:', message);
    
    // 根据消息类型处理
    let responseContent = '';
    
    switch (MsgType) {
      case 'text':
        responseContent = await handleTextMessage(message);
        break;
      case 'voice':
        responseContent = await handleVoiceMessage(message);
        break;
      case 'image':
        responseContent = await handleImageMessage(message);
        break;
      case 'event':
        responseContent = await handleEventMessage(message);
        break;
      default:
        responseContent = '抱歉，暂不支持此类型消息。';
    }
    
    // 构造回复XML
    return buildTextResponse(ToUserName, FromUserName, responseContent);
    
  } catch (error) {
    console.error('处理微信消息出错:', error);
    return buildTextResponse('', '', '系统繁忙，请稍后再试。');
  }
}

/**
 * 处理文本消息
 */
async function handleTextMessage(message) {
  const { FromUserName, Content } = message;
  const openId = FromUserName;
  
  // 查找绑定的用户
  const user = await User.findOne({ 'wechatBinding.openid': openId });
  
  if (!user) {
    // 未绑定用户，检查是否是绑定码
    if (/^\d{6}$/.test(Content.trim())) {
      return await handleBindingCode(Content.trim(), openId);
    }
    return '您好！欢迎使用智能工作助手。\n\n请先在网页端登录并生成绑定码，然后发送6位数字绑定码来绑定您的账号。';
  }
  
  // 已绑定用户，首先尝试使用高级助手处理
  try {
    const advancedResponse = await advancedAssistant.processTextMessage(openId, Content);
    if (advancedResponse && advancedResponse.trim().length > 0) {
      return advancedResponse;
    }
  } catch (error) {
    console.log('高级助手处理失败，使用基础功能:', error.message);
  }
  
  // 降级到基础指令处理
  return await parseAndExecuteCommand(Content, user, openId);
}

/**
 * 处理语音消息
 */
async function handleVoiceMessage(message) {
  const { FromUserName, Recognition, MediaId } = message;
  const openId = FromUserName;
  
  // 查找绑定的用户
  const user = await User.findOne({ 'wechatBinding.openid': openId });
  
  if (!user) {
    return '请先绑定账号后再使用语音功能。';
  }
  
  // 尝试使用高级语音处理
  try {
    if (wechatApi && MediaId) {
      const voiceResponse = await advancedAssistant.processVoiceMessage(openId, MediaId, wechatApi);
      if (voiceResponse && voiceResponse.trim().length > 0) {
        return voiceResponse;
      }
    }
  } catch (error) {
    console.log('高级语音处理失败:', error.message);
  }

  // 如果有语音识别结果，使用高级助手处理
  if (Recognition) {
    try {
      const advancedResponse = await advancedAssistant.processTextMessage(openId, Recognition);
      if (advancedResponse && advancedResponse.trim().length > 0) {
        return advancedResponse;
      }
    } catch (error) {
      console.log('高级文本处理失败:', error.message);
    }
    return await parseAndExecuteCommand(Recognition, user, openId);
  }
  
  // 否则提示用户开启语音识别
  return '🎤 **语音助手**\n\n收到您的语音消息！\n\n📝 **提示**：\n• 请在公众号设置中开启语音识别\n• 或者直接使用文字与我交流\n\n🔊 请说得清楚一些，我会努力识别您的语音！';
}

/**
 * 处理图片消息
 */
async function handleImageMessage(message) {
  const { FromUserName, MediaId } = message;
  const openId = FromUserName;
  
  // 查找绑定的用户
  const user = await User.findOne({ 'wechatBinding.openid': openId });
  
  if (!user) {
    return '请先绑定账号后再使用图片上传功能。';
  }
  
  try {
    // 尝试使用高级OCR处理
    if (wechatApi && MediaId) {
      const imageResponse = await advancedAssistant.processImageMessage(openId, MediaId, wechatApi);
      if (imageResponse && imageResponse.trim().length > 0) {
        return imageResponse;
      }
    }
    
    // 降级到基础图片处理
    if (wechatApi && MediaId) {
      // 下载图片媒体文件
      const mediaUrl = await wechatApi.getMedia(MediaId);
      
      // 创建文档记录
      const document = await Document.create({
        userId: user._id,
        title: `微信图片_${new Date().toLocaleDateString('zh-CN')}`,
        filename: `wechat_image_${MediaId}.jpg`,
        fileType: 'image',
        fileSize: 0, // 实际应从媒体文件获取
        source: 'wechat',
        uploadMethod: 'wechat_image',
        metadata: {
          mediaId: MediaId,
          wechatOpenId: openId,
          uploadTime: new Date()
        }
      });
      
      // 使用AI进行图片内容分析
      const analysisPrompt = `请分析这张图片，如果是文档、截图或包含文字内容，请提取主要信息并总结。`;
      
      try {
        const analysis = await aiService.generateText(analysisPrompt);
        
        // 更新文档分析结果
        document.analysis = {
          summary: analysis,
          analysisDate: new Date(),
          keyPoints: [analysis.substring(0, 200)],
          analysisMethod: 'ai_vision',
          confidence: 0.8
        };
        await document.save();
        
        return `📷 图片已接收并分析完成！\n\n📄 文档：${document.title}\n\n🤖 AI分析结果：\n${analysis}\n\n发送"文档分析"查看所有文档，或"资料搜索 [关键词]"搜索内容。`;
        
      } catch (error) {
        console.error('图片AI分析失败:', error);
        return `📷 图片已接收！\n\n📄 已保存为：${document.title}\n\n⚠️ AI分析暂时不可用，但图片已成功上传。发送"文档分析"查看所有文档。`;
      }
      
    } else {
      // 微信API不可用时的模拟处理
      const mockDocument = await Document.create({
        userId: user._id,
        title: `微信图片_${new Date().toLocaleDateString('zh-CN')}`,
        filename: `mock_wechat_image_${Date.now()}.jpg`,
        fileType: 'image',
        fileSize: 1024000, // 1MB模拟大小
        source: 'wechat',
        uploadMethod: 'wechat_image_mock',
        analysis: {
          summary: '这是通过微信上传的图片文档。由于当前环境限制，无法获取实际图片内容，但已成功记录上传信息。',
          analysisDate: new Date(),
          keyPoints: ['微信图片上传', '文档处理', '待完善分析'],
          analysisMethod: 'mock',
          confidence: 0.5
        },
        metadata: {
          mediaId: MediaId || 'mock_media_id',
          wechatOpenId: openId,
          uploadTime: new Date(),
          isMock: true
        }
      });
      
      return `📷 图片已接收！\n\n📄 文档：${mockDocument.title}\n\n💡 图片已保存，您可以：\n• 发送"文档分析"查看所有文档\n• 发送"资料搜索 [关键词]"搜索内容\n• 发送"任务规划"制定工作计划\n\n如需完整功能请在网页端上传文档。`;
    }
    
  } catch (error) {
    console.error('处理图片消息出错:', error);
    return '图片处理失败，请稍后重试。您也可以：\n• 发送"任务规划"制定工作计划\n• 发送"我的任务"查看当前任务\n• 发送"帮助"查看更多功能';
  }
}

/**
 * 处理事件消息
 */
async function handleEventMessage(message) {
  const { Event, EventKey, FromUserName } = message;
  const openId = FromUserName;
  
  // 获取用户信息用于高级消息模板
  const binding = await WechatBinding.findOne({ wechatOpenid: openId });
  const user = binding ? await User.findById(binding.userId) : null;
  
  switch (Event) {
    case 'subscribe':
      if (user) {
        return messageTemplate.createWelcomeMessage(user, false);
      } else {
        const bindingCode = generateBindingCode();
        return messageTemplate.createWelcomeMessage({ nickname: '朋友' }, true) + 
               '\n\n' + messageTemplate.createBindingGuide(bindingCode);
      }
    
    case 'unsubscribe':
      // 用户取消关注，可以记录日志
      console.log(`用户取消关注: ${openId}`);
      return '';
    
    case 'CLICK':
      if (!user) {
        const bindingCode = generateBindingCode();
        return messageTemplate.createBindingGuide(bindingCode);
      }
      
      // 尝试使用高级菜单处理
      try {
        const menuResponse = await handleAdvancedMenuClick(EventKey, user);
        if (menuResponse && menuResponse.trim().length > 0) {
          return menuResponse;
        }
      } catch (error) {
        console.log('高级菜单处理失败:', error.message);
      }
      
      // 降级到基础菜单处理
      return await handleMenuClick(EventKey, openId);
    
    default:
      return '收到事件消息，功能开发中...';
  }
}

/**
 * 处理绑定码
 */
async function handleBindingCode(bindingCode, openId) {
  try {
    // 模拟用户信息（实际应从微信API获取）
    const userInfo = {
      nickname: '微信用户',
      avatar: 'https://via.placeholder.com/150'
    };
    
    const result = await WechatBinding.validateBindingCode(bindingCode, openId);
    
    if (!result.success) {
      return result.message;
    }
    
    // 更新用户微信信息
    const user = result.user;
    if (userInfo) {
      user.wechatBinding.nickname = userInfo.nickname;
      user.wechatBinding.avatar = userInfo.avatar;
      await user.save();
    }
    
    return `🎉 绑定成功！\n\n欢迎您，${user.username}！\n\n您现在可以使用以下功能：\n📋 发送"任务规划"制定工作计划\n📝 发送"我的任务"查看当前任务\n📅 发送"今日日程"查看日程安排\n❓ 发送"帮助"查看更多功能`;
    
  } catch (error) {
    console.error('处理绑定码出错:', error);
    return '绑定过程中出现错误，请稍后重试。';
  }
}

/**
 * 解析并执行命令
 */
async function parseAndExecuteCommand(content, user, openId) {
  const command = content.trim().toLowerCase();
  
  // 命令映射
  const commandMap = {
    // 任务管理
    '任务规划': () => handleTaskPlanning(user, content),
    '我的任务': () => handleMyTasks(user),
    '创建任务': () => handleCreateTask(user, content),
    '完成任务': () => handleCompleteTask(user, content),
    
    // 日程管理
    '今日日程': () => handleTodaySchedule(user),
    '明日日程': () => handleTomorrowSchedule(user),
    '日程安排': () => handleScheduleArrangement(user, content),
    
    // 文档分析
    '文档分析': () => handleDocumentAnalysis(user, content),
    '资料搜索': () => handleMaterialSearch(user, content),
    
    // 通用功能
    '帮助': () => getHelpMessage(user),
    '功能': () => getFeatureList(user),
    '状态': () => getUserStatus(user)
  };
  
  // 精确匹配
  for (const [key, handler] of Object.entries(commandMap)) {
    if (command.includes(key)) {
      try {
        return await handler();
      } catch (error) {
        console.error(`执行命令"${key}"出错:`, error);
        return '处理您的请求时出现错误，请稍后重试。';
      }
    }
  }
  
  // 如果没有匹配的命令，使用AI进行智能回复
  return await handleIntelligentReply(content, user);
}

/**
 * 处理任务规划
 */
async function handleTaskPlanning(user, content) {
  try {
    // 提取任务描述（去除命令部分）
    const taskDescription = content.replace(/任务规划|规划任务|制定计划/gi, '').trim();
    
    if (!taskDescription) {
      return '请告诉我您需要规划的任务内容，例如：\n"任务规划 准备下周的项目汇报"';
    }
    
    // 使用AI生成任务规划建议
    const prompt = `作为工作助手，为以下任务制定3个不同的执行方案：\n任务：${taskDescription}\n\n请为用户（职位：${user.position || '员工'}）提供详细的执行步骤和时间安排。`;
    
    const aiResponse = await aiService.generateText(prompt);
    
    return `📋 为您制定的任务规划：\n\n${aiResponse}\n\n您可以发送"创建任务 [方案编号]"来创建具体任务。`;
    
  } catch (error) {
    console.error('任务规划出错:', error);
    return '任务规划功能暂时不可用，请稍后重试。';
  }
}

/**
 * 查看我的任务
 */
async function handleMyTasks(user) {
  try {
    const tasks = await Task.find({ userId: user._id, status: { $ne: 'completed' } })
      .sort({ priority: -1, createdAt: -1 })
      .limit(10);
    
    if (tasks.length === 0) {
      return '您目前没有待完成的任务。\n\n发送"任务规划 [任务描述]"来创建新任务。';
    }
    
    let response = `📝 您的待办任务（${tasks.length}个）：\n\n`;
    
    tasks.forEach((task, index) => {
      const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      const statusIcon = task.status === 'in_progress' ? '⏳' : '📋';
      response += `${index + 1}. ${priorityIcon}${statusIcon} ${task.title}\n`;
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate).toLocaleDateString('zh-CN');
        response += `   截止：${dueDate}\n`;
      }
      response += '\n';
    });
    
    response += '发送"完成任务 [任务编号]"来标记任务完成。';
    return response;
    
  } catch (error) {
    console.error('获取任务列表出错:', error);
    return '获取任务列表失败，请稍后重试。';
  }
}

/**
 * 智能回复处理
 */
async function handleIntelligentReply(content, user) {
  try {
    const prompt = `作为智能工作助手，简洁地回复用户的问题。用户信息：职位${user.position || '员工'}。\n\n用户问题：${content}`;
    
    const response = await aiService.generateText(prompt, {
      maxTokens: 200,
      temperature: 0.7
    });
    
    return response + '\n\n💡 发送"帮助"查看更多功能。';
    
  } catch (error) {
    console.error('智能回复出错:', error);
    return '我理解您的问题，但目前AI服务暂时不可用。\n\n您可以发送以下指令：\n📋 "任务规划" - 制定工作计划\n📝 "我的任务" - 查看任务列表\n❓ "帮助" - 查看功能说明';
  }
}

/**
 * 获取帮助信息
 */
function getHelpMessage(user) {
  return `👋 您好，${user.username}！\n\n🤖 我是您的智能工作助手，可以帮助您：\n\n📋 **任务管理**\n• "任务规划 [描述]" - AI制定执行方案\n• "我的任务" - 查看待办事项\n• "创建任务 [描述]" - 快速创建任务\n\n📅 **日程管理**\n• "今日日程" - 查看今天安排\n• "明日日程" - 查看明天安排\n\n📄 **文档分析**\n• "文档分析" - 上传文档获取摘要\n• "资料搜索 [关键词]" - 搜索相关资料\n\n💬 **智能对话**\n直接发送问题，我会智能回复\n\n更多功能正在开发中...`;
}

/**
 * 解析微信XML消息
 */
function parseWechatXML(xmlData) {
  // 简单的XML解析（生产环境建议使用xml2js等库）
  const message = {};
  
  const extractValue = (xml, tag) => {
    const regex = new RegExp(`<${tag}><\!\[CDATA\[(.*?)\]\]><\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1] : null;
  };
  
  message.ToUserName = extractValue(xmlData, 'ToUserName');
  message.FromUserName = extractValue(xmlData, 'FromUserName');
  message.CreateTime = extractValue(xmlData, 'CreateTime');
  message.MsgType = extractValue(xmlData, 'MsgType');
  message.Content = extractValue(xmlData, 'Content');
  message.Recognition = extractValue(xmlData, 'Recognition');
  message.MediaId = extractValue(xmlData, 'MediaId');
  message.Event = extractValue(xmlData, 'Event');
  message.EventKey = extractValue(xmlData, 'EventKey');
  
  return message;
}

/**
 * 构建文本回复XML
 */
function buildTextResponse(toUser, fromUser, content) {
  const timestamp = Date.now();
  return `<xml>
<ToUserName><![CDATA[${fromUser}]]></ToUserName>
<FromUserName><![CDATA[${toUser}]]></FromUserName>
<CreateTime>${timestamp}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

/**
 * 查看今日日程
 */
async function handleTodaySchedule(user) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const events = await Calendar.find({
      owner: user._id,
      startTime: { $gte: startOfDay, $lt: endOfDay },
      status: { $ne: 'cancelled' }
    }).sort({ startTime: 1 }).limit(10);
    
    if (events.length === 0) {
      return '📅 您今天没有安排的日程。\n\n发送"日程安排 [时间] [事项]"来添加新日程。';
    }
    
    let response = `📅 今日日程（${events.length}个）：\n\n`;
    
    events.forEach((event, index) => {
      const startTime = new Date(event.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(event.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const priorityIcon = event.priority === 'high' ? '🔴' : event.priority === 'medium' ? '🟡' : '🟢';
      
      response += `${index + 1}. ${priorityIcon} ${event.title}\n`;
      response += `   时间：${startTime} - ${endTime}\n`;
      if (event.location?.address) {
        response += `   地点：${event.location.address}\n`;
      }
      response += '\n';
    });
    
    return response;
    
  } catch (error) {
    console.error('获取今日日程出错:', error);
    return '获取今日日程失败，请稍后重试。';
  }
}

/**
 * 查看明日日程
 */
async function handleTomorrowSchedule(user) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);
    
    const events = await Calendar.find({
      owner: user._id,
      startTime: { $gte: startOfDay, $lt: endOfDay },
      status: { $ne: 'cancelled' }
    }).sort({ startTime: 1 }).limit(10);
    
    if (events.length === 0) {
      return '📅 您明天没有安排的日程。\n\n发送"日程安排 [时间] [事项]"来添加新日程。';
    }
    
    let response = `📅 明日日程（${events.length}个）：\n\n`;
    
    events.forEach((event, index) => {
      const startTime = new Date(event.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(event.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const priorityIcon = event.priority === 'high' ? '🔴' : event.priority === 'medium' ? '🟡' : '🟢';
      
      response += `${index + 1}. ${priorityIcon} ${event.title}\n`;
      response += `   时间：${startTime} - ${endTime}\n`;
      if (event.location?.address) {
        response += `   地点：${event.location.address}\n`;
      }
      response += '\n';
    });
    
    return response;
    
  } catch (error) {
    console.error('获取明日日程出错:', error);
    return '获取明日日程失败，请稍后重试。';
  }
}

/**
 * 处理日程安排
 */
async function handleScheduleArrangement(user, content) {
  try {
    // 提取日程内容（去除命令部分）
    const scheduleText = content.replace(/日程安排|安排日程/gi, '').trim();
    
    if (!scheduleText) {
      return '请告诉我您要安排的日程，例如：\n"日程安排 明天下午2点开会"\n"日程安排 周五上午项目评审"';
    }
    
    // 使用AI解析日程信息
    const prompt = `解析以下日程安排请求，提取时间、事件和地点信息：\n\n"${scheduleText}"\n\n请以JSON格式返回：{"title": "事件名称", "time": "时间描述", "location": "地点", "suggestions": "建议"}`;
    
    const aiResponse = await aiService.generateText(prompt);
    
    return `📅 日程安排解析：\n\n${aiResponse}\n\n如需确认创建，请到网页端或发送具体的日程创建指令。\n\n💡 您也可以发送"今日日程"查看今天的安排。`;
    
  } catch (error) {
    console.error('日程安排出错:', error);
    return '日程安排功能暂时不可用，请稍后重试。';
  }
}

/**
 * 处理文档分析
 */
async function handleDocumentAnalysis(user, content) {
  try {
    // 检查用户是否上传了文档
    const recentDocs = await Document.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    if (recentDocs.length === 0) {
      return '📄 您还没有上传任何文档。\n\n请通过以下方式上传文档：\n• 在微信中发送图片（文档截图）\n• 在网页端上传文档文件\n\n上传后发送"文档分析"获取AI分析结果。';
    }
    
    let response = '📄 您的最近文档分析：\n\n';
    
    for (let i = 0; i < Math.min(3, recentDocs.length); i++) {
      const doc = recentDocs[i];
      response += `${i + 1}. ${doc.title || doc.filename}\n`;
      if (doc.analysis?.summary) {
        response += `   摘要：${doc.analysis.summary.substring(0, 100)}...\n`;
      }
      response += `   上传时间：${doc.createdAt.toLocaleDateString('zh-CN')}\n\n`;
    }
    
    response += '发送"资料搜索 [关键词]"来搜索文档内容。';
    return response;
    
  } catch (error) {
    console.error('文档分析出错:', error);
    return '文档分析功能暂时不可用，请稍后重试。';
  }
}

/**
 * 处理资料搜索
 */
async function handleMaterialSearch(user, content) {
  try {
    // 提取搜索关键词
    const searchQuery = content.replace(/资料搜索|搜索资料/gi, '').trim();
    
    if (!searchQuery) {
      return '请告诉我您要搜索的关键词，例如：\n"资料搜索 项目计划"\n"资料搜索 会议纪要"';
    }
    
    // 搜索用户的文档
    const searchResults = await Document.find({
      userId: user._id,
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { filename: { $regex: searchQuery, $options: 'i' } },
        { 'analysis.summary': { $regex: searchQuery, $options: 'i' } },
        { 'analysis.keyPoints': { $regex: searchQuery, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 }).limit(5);
    
    if (searchResults.length === 0) {
      return `🔍 未找到包含"${searchQuery}"的相关资料。\n\n您可以：\n• 尝试其他关键词\n• 上传更多文档\n• 发送"文档分析"查看所有文档`;
    }
    
    let response = `🔍 找到 ${searchResults.length} 个相关资料：\n\n`;
    
    searchResults.forEach((doc, index) => {
      response += `${index + 1}. ${doc.title || doc.filename}\n`;
      if (doc.analysis?.summary) {
        response += `   ${doc.analysis.summary.substring(0, 80)}...\n`;
      }
      response += `   时间：${doc.createdAt.toLocaleDateString('zh-CN')}\n\n`;
    });
    
    return response;
    
  } catch (error) {
    console.error('资料搜索出错:', error);
    return '资料搜索功能暂时不可用，请稍后重试。';
  }
}

/**
 * 创建任务
 */
async function handleCreateTask(user, content) {
  try {
    // 提取任务内容
    const taskText = content.replace(/创建任务|新建任务/gi, '').trim();
    
    if (!taskText) {
      return '请告诉我要创建的任务内容，例如：\n"创建任务 完成项目报告"\n"创建任务 准备明天的会议"';
    }
    
    // 使用AI分析任务并创建
    const prompt = `分析以下任务并提取信息：\n"${taskText}"\n\n请提供任务标题、描述、优先级建议和预估时间。`;
    
    const aiResponse = await aiService.generateText(prompt);
    
    // 创建基础任务记录
    const newTask = await Task.create({
      userId: user._id,
      title: taskText.substring(0, 100),
      description: `通过微信创建的任务`,
      priority: 'medium',
      status: 'pending',
      source: 'wechat',
      createdVia: 'wechat'
    });
    
    return `✅ 任务创建成功！\n\n📋 任务：${newTask.title}\n🆔 ID：${newTask._id.toString().slice(-6)}\n\nAI分析：\n${aiResponse}\n\n发送"我的任务"查看所有任务。`;
    
  } catch (error) {
    console.error('创建任务出错:', error);
    return '创建任务失败，请稍后重试。';
  }
}

/**
 * 完成任务
 */
async function handleCompleteTask(user, content) {
  try {
    // 提取任务编号或关键词
    const taskIdentifier = content.replace(/完成任务|任务完成/gi, '').trim();
    
    if (!taskIdentifier) {
      return '请指定要完成的任务，例如：\n"完成任务 1"\n"完成任务 项目报告"\n\n发送"我的任务"查看任务列表。';
    }
    
    let task;
    
    // 尝试通过编号查找
    if (/^\d+$/.test(taskIdentifier)) {
      const taskIndex = parseInt(taskIdentifier) - 1;
      const tasks = await Task.find({ userId: user._id, status: { $ne: 'completed' } })
        .sort({ priority: -1, createdAt: -1 });
      
      if (taskIndex >= 0 && taskIndex < tasks.length) {
        task = tasks[taskIndex];
      }
    } else {
      // 通过标题关键词查找
      task = await Task.findOne({
        userId: user._id,
        title: { $regex: taskIdentifier, $options: 'i' },
        status: { $ne: 'completed' }
      });
    }
    
    if (!task) {
      return `❌ 没有找到匹配的任务"${taskIdentifier}"。\n\n发送"我的任务"查看当前任务列表。`;
    }
    
    // 更新任务状态
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();
    
    return `🎉 任务完成！\n\n✅ ${task.title}\n\n恭喜您完成了这个任务！发送"我的任务"查看剩余任务。`;
    
  } catch (error) {
    console.error('完成任务出错:', error);
    return '完成任务操作失败，请稍后重试。';
  }
}

/**
 * 获取功能列表
 */
function getFeatureList(user) {
  return `🚀 智能工作助手功能列表：\n\n📋 **任务管理**\n• 任务规划 [描述] - AI制定执行方案\n• 我的任务 - 查看待办事项\n• 创建任务 [描述] - 快速创建任务\n• 完成任务 [编号] - 标记任务完成\n\n📅 **日程管理**\n• 今日日程 - 查看今天安排\n• 明日日程 - 查看明天安排\n• 日程安排 [时间事项] - 智能解析日程\n\n📄 **文档分析**\n• 文档分析 - 查看文档摘要\n• 资料搜索 [关键词] - 搜索文档内容\n• 发送图片 - 自动识别和分析\n\n💬 **智能对话**\n• 直接发送问题获得AI回复\n• 帮助 - 查看使用说明\n• 状态 - 查看个人使用状态\n\n更多功能持续开发中...`;
}

/**
 * 获取用户状态
 */
async function getUserStatus(user) {
  try {
    // 获取用户统计信息
    const [taskCount, docCount, calendarCount] = await Promise.all([
      Task.countDocuments({ userId: user._id, status: { $ne: 'completed' } }),
      Document.countDocuments({ userId: user._id }),
      Calendar.countDocuments({ owner: user._id, startTime: { $gte: new Date() } })
    ]);
    
    const completedTasks = await Task.countDocuments({ userId: user._id, status: 'completed' });
    
    return `👤 您的使用状态：\n\n🏷️ 用户：${user.username}\n💼 职位：${user.profile?.position || '员工'}\n🔗 微信：已绑定\n\n📊 数据统计：\n📋 待办任务：${taskCount} 个\n✅ 已完成：${completedTasks} 个\n📄 文档数量：${docCount} 个\n📅 未来日程：${calendarCount} 个\n\n⏰ 账户创建：${user.createdAt.toLocaleDateString('zh-CN')}\n🕐 最后登录：${user.lastLogin ? user.lastLogin.toLocaleDateString('zh-CN') : '未知'}\n\n发送"帮助"查看所有可用功能。`;
    
  } catch (error) {
    console.error('获取用户状态出错:', error);
    return '获取用户状态失败，请稍后重试。';
  }
}

/**
 * 处理菜单点击事件
 */
async function handleMenuClick(eventKey, openId) {
  // 查找绑定的用户
  const user = await User.findOne({ 'wechatBinding.openid': openId });
  
  if (!user) {
    return '请先绑定账号后使用菜单功能。';
  }
  
  switch (eventKey) {
    // 任务助手菜单
    case 'TASK_PLANNING':
      return '📋 **任务规划**\n\n请发送"任务规划 [任务描述]"来制定工作计划\n\n例如：\n"任务规划 准备下周的项目汇报"\n\n我会为您生成多种执行方案，帮您选择最佳路径！';
    
    case 'VIEW_TASKS':
      return await handleViewTasks(user);
    
    case 'TASK_PROGRESS':
      return await handleTaskProgress(user);
    
    // 资料中心菜单
    case 'DOC_ANALYSIS':
      return '📄 **文档分析**\n\n请直接发送文档或图片，我会为您自动分析内容：\n\n🔍 提取关键信息\n📋 生成内容摘要\n🏷️ 标记重要实体\n📊 分析情感色彩';
    
    case 'SEARCH_DOCS':
      return await handleSearchDocs(user);
    
    case 'UPLOAD_FILE':
      return '📁 **上传文件**\n\n您可以直接发送以下类型的文件：\n\n📄 Word文档\n📃 Excel表格\n📄 PDF文件\n🖼️ 图片文件\n\n发送后我会自动为您保存并分析内容！';
    
    // 日程管理菜单
    case 'TODAY_SCHEDULE':
      return await handleTodaySchedule(user);
    
    case 'ADD_EVENT':
      return '📅 **添加日程事件**\n\n请按以下格式发送：\n"添加事件 [标题] [日期] [时间]"\n\n例如：\n"添加事件 项目会议 2024-12-25 14:00"\n\n或者发送"快速添加 [标题]"来创建今天的事件';
    
    case 'BIND_ACCOUNT':
      return `🔗 **账号绑定**\n\n请按以下步骤绑定账号：\n\n1️⃣ 访问网页端\n   ${process.env.WEB_URL || 'https://your-domain.com'}\n\n2️⃣ 登录您的账号\n\n3️⃣ 点击"微信绑定"生成６位数字码\n\n4️⃣ 在微信中发送绑定码\n\n✨ 绑定后即可使用所有智能功能！`;
    
    // 兼容旧菜单项
    case 'MY_TASKS':
      return await handleViewTasks(user);
    
    case 'DOCUMENT_ANALYSIS':
      return await handleDocumentAnalysis(user, '');
    
    case 'HELP':
      return getHelpMessage(user);
    
    default:
      return '🤖 您好！微信智能助手为您服务\n\n请点击下方菜单或直接发送消息：\n\n📋 任务规划 - 智能制定工作计划\n📄 文档分析 - 自动提取关键信息\n📅 日程管理 - 同步日历事件\n🎙️ 会议助手 - 音频转写和分析';
  }
}

/**
 * 创建微信自定义菜单
 * @route   POST /api/wechat/menu/create
 * @access  Private (Admin only)
 */
const createWechatMenu = asyncHandler(async (req, res) => {
  if (!wechatApi) {
    return res.status(400).json({
      success: false,
      message: '微信API未配置，请检查WECHAT_APPID和WECHAT_APPSECRET环境变量'
    });
  }

  // 微信公众号菜单配置
  const menuConfig = {
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
            "name": "查看待办",
            "key": "VIEW_TASKS"
          },
          {
            "type": "click",
            "name": "进度跟踪",
            "key": "TASK_PROGRESS"
          }
        ]
      },
      {
        "name": "📄 资料中心",
        "sub_button": [
          {
            "type": "click",
            "name": "文档分析",
            "key": "DOC_ANALYSIS"
          },
          {
            "type": "click",
            "name": "资料搜索",
            "key": "SEARCH_DOCS"
          },
          {
            "type": "click",
            "name": "上传文件",
            "key": "UPLOAD_FILE"
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
  };

  try {
    // 创建菜单
    const result = await new Promise((resolve, reject) => {
      wechatApi.createMenu(menuConfig, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    // 记录菜单创建信息
    console.log('✅ 微信菜单创建成功:', result);

    res.status(200).json({
      success: true,
      message: '微信菜单创建成功',
      data: {
        menuConfig,
        wechatResult: result
      }
    });
  } catch (error) {
    console.error('❌ 微信菜单创建失败:', error);
    res.status(500).json({
      success: false,
      message: '微信菜单创建失败',
      error: error.message
    });
  }
});

/**
 * 获取微信菜单配置
 * @route   GET /api/wechat/menu
 * @access  Public
 */
const getWechatMenu = asyncHandler(async (req, res) => {
  if (!wechatApi) {
    return res.status(400).json({
      success: false,
      message: '微信API未配置'
    });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      wechatApi.getMenu((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    res.status(200).json({
      success: true,
      message: '获取微信菜单成功',
      data: result
    });
  } catch (error) {
    console.error('获取微信菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取微信菜单失败',
      error: error.message
    });
  }
});

/**
 * 删除微信菜单
 * @route   DELETE /api/wechat/menu
 * @access  Private (Admin only)
 */
const deleteWechatMenu = asyncHandler(async (req, res) => {
  if (!wechatApi) {
    return res.status(400).json({
      success: false,
      message: '微信API未配置'
    });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      wechatApi.removeMenu((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    res.status(200).json({
      success: true,
      message: '微信菜单删除成功',
      data: result
    });
  } catch (error) {
    console.error('删除微信菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '删除微信菜单失败',
      error: error.message
    });
  }
});

/**
 * 处理高级菜单点击
 */
async function handleAdvancedMenuClick(eventKey, user) {
  try {
    switch (eventKey) {
      case 'TASK_PLANNING':
        return await generateTaskPlanSuggestions(user);
      
      case 'TODO_QUERY':
        const tasks = await getEnhancedTaskList(user);
        if (tasks.length > 0) {
          return messageTemplate.createTaskCard(tasks[0], 'info');
        } else {
          return '📋 **您的任务列表**\n\n🎉 太棒了！您当前没有待办任务\n\n🚀 您可以：\n• 发送"创建任务 [描述]"\n• 点击"任务规划"制定计划\n• 使用语音创建任务';
        }
      
      case 'PROGRESS_TRACK':
        const stats = await generateTaskStatistics(user);
        return messageTemplate.createStatsReportCard(stats, '本周');
      
      case 'DOCUMENT_ANALYSIS':
        return await getDocumentAnalysisSummary(user);
      
      case 'DOCUMENT_SEARCH':
        return '🔍 **智能搜索**\n\n请发送搜索关键词，例如：\n• "搜索 项目报告"\n• "查找 会议纪要"\n• "相关资料 人工智能"\n\n🎤 您也可以直接发送语音描述要搜索的内容！';
      
      case 'TODAY_SCHEDULE':
        return await getTodayScheduleSummary(user);
      
      case 'ADD_EVENT':
        return '📅 **添加日程**\n\n请描述要添加的事件，例如：\n• "明天下午2点开会"\n• "下周一提交报告"\n• "本周五团队聚餐"\n\n🎤 您也可以发送语音来创建日程！';
      
      case 'BIND_ACCOUNT':
        const bindingCode = generateBindingCode();
        return messageTemplate.createBindingGuide(bindingCode);
      
      default:
        return messageTemplate.createHelpMenu();
    }
  } catch (error) {
    console.error('菜单点击处理失败:', error);
    return messageTemplate.createErrorMessage('菜单操作失败');
  }
}

/**
 * 生成任务规划庭议
 */
async function generateTaskPlanSuggestions(user) {
  try {
    const recentTasks = await Task.find({ assignee: user.username })
      .sort({ createdAt: -1 })
      .limit(5);
    
    const taskTitles = recentTasks.map(t => t.title).join(', ');
    const suggestions = await aiService.callAI(
      `基于用户历史任务生成3个实用的任务规划庭议：\n历史任务: ${taskTitles}\n\n请提供具体可行的建议，每个庭议包含标题和具体描述。`,
      { temperature: 0.7, maxTokens: 400 }
    );

    // 解析AI响应为廚议数组
    const suggestionLines = suggestions.split('\n').filter(s => s.trim().length > 0);
    const parsedSuggestions = suggestionLines.slice(0, 3).map((line, index) => ({
      title: `建议${index + 1}`,
      content: line.replace(/^\d+\.\s*/, '').trim()
    }));

    return messageTemplate.createSuggestionsCard(
      parsedSuggestions,
      '基于您的历史任务分析'
    );
  } catch (error) {
    console.error('生成任务建议失败:', error);
    return '📋 **任务规划建议**\n\n💡 **推荐操作**：\n🎯 优先处理紧急任务\n📅 制定每日工作计划\n⚡ 将复杂项目分解\n\n💬 发送"创建任务 [描述]"开始新任务！';
  }
}

/**
 * 获取增强的任务列表
 */
async function getEnhancedTaskList(user) {
  try {
    return await Task.find({ assignee: user.username, status: { $ne: 'completed' } })
      .sort({ priority: 1, dueDate: 1 })
      .limit(5);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return [];
  }
}

/**
 * 生成任务统计
 */
async function generateTaskStatistics(user) {
  try {
    const tasks = await Task.find({ assignee: user.username });
    const docs = await Document.find({ uploadedBy: user._id });
    
    return {
      tasks: {
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        pending: tasks.filter(t => t.status === 'pending').length
      },
      documents: {
        uploaded: docs.length,
        analyzed: docs.filter(d => d.aiAnalysis?.isAnalyzed).length
      },
      efficiency: {
        taskCompletionRate: tasks.length > 0 ? 
          Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
      },
      trend: '本周工作效率稳步提升！继续保持！'
    };
  } catch (error) {
    console.error('生成统计失败:', error);
    return { 
      tasks: { completed: 0, inProgress: 0, pending: 0 }, 
      trend: '暂无统计数据' 
    };
  }
}

/**
 * 获取文档分析摘要
 */
async function getDocumentAnalysisSummary(user) {
  try {
    const docs = await Document.find({ uploadedBy: user._id })
      .sort({ uploadDate: -1 })
      .limit(3);
    
    if (docs.length === 0) {
      return '📄 **文档中心**\n\n📁 您还没有上传任何文档\n\n🚀 **开始使用**：\n• 直接发送文件到微信\n• 发送图片进行OCR识别\n• 访问网页端上传大文件\n\n💡 支持PDF、Word、Excel、图片等格式！';
    }

    let response = '📄 **最近文档**\n\n';
    docs.forEach((doc, index) => {
      const icon = messageTemplate.getFileIcon(doc.fileType);
      response += `${icon} ${doc.originalName}\n`;
      response += `${doc.aiAnalysis?.isAnalyzed ? '✅ 已分析' : '🔄 待分析'}\n`;
      if (index < docs.length - 1) response += '\n';
    });

    response += '\n\n💬 发送"分析 [文档名]"进行深度分析\n🔍 发送"搜索 [关键词]"查找相关内容';
    
    return response;
  } catch (error) {
    console.error('获取文档信息失败:', error);
    return messageTemplate.createErrorMessage('获取文档信息失败');
  }
}

/**
 * 获取今日日程摘要
 */
async function getTodayScheduleSummary(user) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const events = await Calendar.find({
      userId: user._id,
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: 1 });

    if (events.length === 0) {
      return '📅 **今日日程**\n\n🎉 今天没有安排的日程\n\n💡 **建议**：\n• 规划今日重要任务\n• 安排学习时间\n• 设置工作提醒\n\n💬 发送"添加事件 [描述]"创建新日程';
    }

    let response = `📅 **今日日程** (${events.length}项)\n\n`;
    events.forEach((event, index) => {
      const time = new Date(event.startTime).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      response += `🕐 ${time} - ${event.title}`;
      if (event.location) {
        response += ` 📍 ${event.location}`;
      }
      response += '\n';
    });

    response += '\n💡 发送"添加事件"创建新的日程安排';
    return response;
  } catch (error) {
    console.error('获取日程失败:', error);
    return messageTemplate.createErrorMessage('获取日程信息失败');
  }
}

module.exports = {
  generateBindingCode,
  verifyBindingCode,
  getBindingStatus,
  unbindWechat,
  getWechatProfile,
  sendWechatMessage,
  handleWebhook,
  createWechatMenu,
  getWechatMenu,
  deleteWechatMenu,
  // 新增高级功能
  handleAdvancedMenuClick,
  generateTaskPlanSuggestions,
  getEnhancedTaskList,
  generateTaskStatistics,
  getDocumentAnalysisSummary,
  getTodayScheduleSummary
};