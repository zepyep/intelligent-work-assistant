const User = require('../models/User');
const WechatBinding = require('../models/WechatBinding');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/aiService');
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
  
  // 已绑定用户，处理指令
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
  
  // 如果有语音识别结果，直接处理
  if (Recognition) {
    return await parseAndExecuteCommand(Recognition, user, openId);
  }
  
  // 否则提示用户开启语音识别
  return '收到您的语音消息，但语音识别功能需要在微信公众号后台开启。请使用文字消息与我交流。';
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
  
  return '收到您的图片，文档分析功能正在开发中，敬请期待！\n\n您可以发送以下指令：\n• "任务规划" - 制定工作计划\n• "我的任务" - 查看当前任务\n• "帮助" - 查看更多功能';
}

/**
 * 处理事件消息
 */
async function handleEventMessage(message) {
  const { Event, EventKey, FromUserName } = message;
  const openId = FromUserName;
  
  switch (Event) {
    case 'subscribe':
      return `欢迎关注智能工作助手！🎉\n\n我是您的AI工作伙伴，可以帮助您：\n📋 任务规划和管理\n📄 文档分析总结\n🎤 会议录音处理\n📅 日程安排同步\n\n请先在网页端(${process.env.WEB_URL || 'https://your-domain.com'})登录并生成绑定码来绑定账号。`;
    
    case 'unsubscribe':
      // 用户取消关注，可以记录日志
      console.log(`用户取消关注: ${openId}`);
      return '';
    
    case 'CLICK':
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

module.exports = {
  generateBindingCode,
  verifyBindingCode,
  getBindingStatus,
  unbindWechat,
  getWechatProfile,
  sendWechatMessage,
  handleWebhook
};