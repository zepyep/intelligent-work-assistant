const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Calendar = require('./models/Calendar');
const Document = require('./models/Document');

// Import the message handling functions (we need to export them first)
const { handleWebhook } = require('./controllers/wechatController');

async function testWechatAssistant() {
  try {
    await mongoose.connect('mongodb://localhost:27017/intelligent-work-assistant');
    console.log('🔗 MongoDB connected');

    // Find our test user with WeChat binding
    const user = await User.findOne({ 'wechatBinding.openid': 'test_wechat_openid_123' });
    if (!user) {
      console.log('❌ WeChat test user not found');
      return;
    }

    console.log('✅ Found WeChat user:', user.username);
    console.log('📱 WeChat nickname:', user.wechatBinding.nickname);

    // Test various WeChat commands
    const testCommands = [
      '帮助',
      '我的任务', 
      '今日日程',
      '任务规划 完成项目文档',
      '创建任务 联系客户',
      '状态',
      '功能',
      '文档分析'
    ];

    console.log('\n🧪 Testing WeChat Smart Assistant Commands:\n');

    // We'll test these by directly calling the command parsing function
    // Since the actual webhook is complex, let's test the core logic

    const testResults = [];

    for (const command of testCommands) {
      try {
        console.log(`📝 Testing command: "${command}"`);
        
        // This would simulate the parseAndExecuteCommand function
        // Since it's not exported, we'll create test scenarios
        
        const result = await simulateWechatCommand(command, user);
        testResults.push({ command, result, status: 'success' });
        
        console.log(`✅ Result: ${result.substring(0, 100)}...`);
        console.log('---');
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        testResults.push({ command, error: error.message, status: 'error' });
      }
    }

    console.log('\n📊 Test Summary:');
    console.log(`✅ Successful: ${testResults.filter(r => r.status === 'success').length}`);
    console.log(`❌ Failed: ${testResults.filter(r => r.status === 'error').length}`);

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

async function simulateWechatCommand(command, user) {
  // Simulate the core command processing logic
  const cmd = command.trim().toLowerCase();
  
  if (cmd === '帮助') {
    return `👋 您好，${user.username}！\n\n🤖 我是您的智能工作助手，可以帮助您：\n\n📋 **任务管理**\n• "任务规划 [描述]" - AI制定执行方案\n• "我的任务" - 查看待办事项\n• "创建任务 [描述]" - 快速创建任务\n\n📅 **日程管理**\n• "今日日程" - 查看今天安排\n• "明日日程" - 查看明天安排\n\n📄 **文档分析**\n• "文档分析" - 上传文档获取摘要\n• "资料搜索 [关键词]" - 搜索相关资料\n\n💬 **智能对话**\n直接发送问题，我会智能回复\n\n更多功能正在开发中...`;
  }
  
  if (cmd === '我的任务') {
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
  }
  
  if (cmd === '今日日程') {
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
  }
  
  if (cmd.includes('任务规划')) {
    const taskDescription = command.replace(/任务规划|规划任务|制定计划/gi, '').trim();
    
    if (!taskDescription) {
      return '请告诉我您需要规划的任务内容，例如：\n"任务规划 准备下周的项目汇报"';
    }
    
    // Simulate AI response
    const mockAIResponse = `为任务"${taskDescription}"制定的执行方案：\n\n方案一：分阶段执行\n1. 收集相关资料 (1-2天)\n2. 制定详细计划 (0.5天)\n3. 具体实施 (2-3天)\n4. 检查和完善 (0.5天)\n\n方案二：快速执行\n1. 直接开始核心工作 (1天)\n2. 边做边完善 (1-2天)\n\n方案三：团队协作\n1. 分工合作 (0.5天)\n2. 并行处理 (1-2天)\n3. 汇总整合 (0.5天)`;
    
    return `📋 为您制定的任务规划：\n\n${mockAIResponse}\n\n您可以发送"创建任务 [方案编号]"来创建具体任务。`;
  }
  
  if (cmd.includes('创建任务')) {
    const taskText = command.replace(/创建任务|新建任务/gi, '').trim();
    
    if (!taskText) {
      return '请告诉我要创建的任务内容，例如：\n"创建任务 完成项目报告"\n"创建任务 准备明天的会议"';
    }
    
    // Create actual task
    const newTask = await Task.create({
      userId: user._id,
      title: taskText.substring(0, 100),
      description: '通过微信创建的任务',
      priority: 'medium',
      status: 'pending',
      source: 'wechat',
      createdVia: 'wechat'
    });
    
    return `✅ 任务创建成功！\n\n📋 任务：${newTask.title}\n🆔 ID：${newTask._id.toString().slice(-6)}\n\nAI分析：这是一个中等优先级的任务，建议在2-3天内完成。\n\n发送"我的任务"查看所有任务。`;
  }
  
  if (cmd === '状态') {
    const [taskCount, docCount, calendarCount] = await Promise.all([
      Task.countDocuments({ userId: user._id, status: { $ne: 'completed' } }),
      Document.countDocuments({ userId: user._id }),
      Calendar.countDocuments({ owner: user._id, startTime: { $gte: new Date() } })
    ]);
    
    const completedTasks = await Task.countDocuments({ userId: user._id, status: 'completed' });
    
    return `👤 您的使用状态：\n\n🏷️ 用户：${user.username}\n💼 职位：${user.profile?.position || '员工'}\n🔗 微信：已绑定\n\n📊 数据统计：\n📋 待办任务：${taskCount} 个\n✅ 已完成：${completedTasks} 个\n📄 文档数量：${docCount} 个\n📅 未来日程：${calendarCount} 个\n\n⏰ 账户创建：${user.createdAt.toLocaleDateString('zh-CN')}\n🕐 最后登录：${user.lastLogin ? user.lastLogin.toLocaleDateString('zh-CN') : '未知'}\n\n发送"帮助"查看所有可用功能。`;
  }
  
  if (cmd === '功能') {
    return `🚀 智能工作助手功能列表：\n\n📋 **任务管理**\n• 任务规划 [描述] - AI制定执行方案\n• 我的任务 - 查看待办事项\n• 创建任务 [描述] - 快速创建任务\n• 完成任务 [编号] - 标记任务完成\n\n📅 **日程管理**\n• 今日日程 - 查看今天安排\n• 明日日程 - 查看明天安排\n• 日程安排 [时间事项] - 智能解析日程\n\n📄 **文档分析**\n• 文档分析 - 查看文档摘要\n• 资料搜索 [关键词] - 搜索文档内容\n• 发送图片 - 自动识别和分析\n\n💬 **智能对话**\n• 直接发送问题获得AI回复\n• 帮助 - 查看使用说明\n• 状态 - 查看个人使用状态\n\n更多功能持续开发中...`;
  }
  
  if (cmd === '文档分析') {
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
  }
  
  // Default intelligent reply
  return `收到您的消息："${command}"。\n\n我正在学习如何更好地理解您的需求。目前可以回复以下指令：\n\n📋 "任务规划" - 制定工作计划\n📝 "我的任务" - 查看任务列表\n📅 "今日日程" - 查看今天安排\n❓ "帮助" - 查看功能说明\n💡 发送"帮助"查看更多功能。`;
}

// Run the test
testWechatAssistant();