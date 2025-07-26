const Task = require('../models/Task');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/aiService');

/**
 * 获取用户任务列表
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = asyncHandler(async (req, res) => {
  const { 
    status, 
    priority, 
    category,
    page = 1, 
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1 
  } = req.query;

  const userId = req.user.id;

  // 构建查询条件
  const query = {
    $or: [
      { createdBy: userId },
      { assignedTo: userId }
    ]
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('createdBy', 'username profile.firstName profile.lastName')
      .populate('assignedTo', 'username profile.firstName profile.lastName')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * 创建新任务
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority = 'medium',
    category = 'work',
    dueDate,
    estimatedHours,
    tags = [],
    assignedTo
  } = req.body;

  const taskData = {
    title,
    description,
    priority,
    category,
    createdBy: req.user.id,
    tags,
    metadata: {
      createdVia: 'web'
    }
  };

  if (dueDate) taskData.dueDate = new Date(dueDate);
  if (estimatedHours) taskData.estimatedHours = estimatedHours;
  if (assignedTo) taskData.assignedTo = assignedTo;

  const task = await Task.create(taskData);
  await task.populate([
    { path: 'createdBy', select: 'username profile.firstName profile.lastName' },
    { path: 'assignedTo', select: 'username profile.firstName profile.lastName' }
  ]);

  // 添加活动日志
  await task.addActivityLog('created', req.user.id, '任务已创建');

  res.status(201).json({
    success: true,
    message: '任务创建成功',
    data: { task }
  });
});

/**
 * AI任务规划 - 生成多种方案
 * @route   POST /api/tasks/ai-planning
 * @access  Private
 */
const generateTaskPlanning = asyncHandler(async (req, res) => {
  const { taskDescription, deadline, additionalContext } = req.body;

  if (!taskDescription) {
    return res.status(400).json({
      success: false,
      message: '请提供任务描述'
    });
  }

  try {
    // 获取用户职位信息
    const user = await User.findById(req.user.id);
    const userPosition = user.profile?.position || '员工';

    // 调用AI服务生成规划
    const aiPlans = await aiService.generateTaskPlanning(
      taskDescription, 
      userPosition, 
      deadline
    );

    if (!aiPlans || aiPlans.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'AI规划生成失败，请稍后重试'
      });
    }

    res.status(200).json({
      success: true,
      message: `成功生成${aiPlans.length}个任务规划方案`,
      data: {
        plans: aiPlans,
        userPosition,
        taskDescription,
        deadline,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('AI任务规划生成失败:', error);
    res.status(500).json({
      success: false,
      message: 'AI规划生成失败: ' + error.message
    });
  }
});

/**
 * 基于AI规划创建任务
 * @route   POST /api/tasks/create-from-ai
 * @access  Private
 */
const createTaskFromAI = asyncHandler(async (req, res) => {
  const {
    selectedPlanId,
    plans,
    taskDescription,
    deadline,
    customTitle,
    priority = 'medium',
    category = 'work'
  } = req.body;

  if (!selectedPlanId || !plans || !Array.isArray(plans)) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的规划方案数据'
    });
  }

  // 找到选中的方案
  const selectedPlan = plans.find(plan => plan.id.toString() === selectedPlanId.toString());
  
  if (!selectedPlan) {
    return res.status(400).json({
      success: false,
      message: '未找到指定的规划方案'
    });
  }

  // 创建任务
  const taskData = {
    title: customTitle || selectedPlan.title || taskDescription.slice(0, 100),
    description: taskDescription,
    priority,
    category,
    createdBy: req.user.id,
    selectedPlan: selectedPlanId,
    aiPlans: plans.map(plan => ({
      planId: plan.id,
      title: plan.title,
      content: plan.content,
      priority: plan.priority,
      generatedAt: new Date()
    })),
    metadata: {
      createdVia: 'ai_generated',
      sourceType: 'ai_planning'
    }
  };

  if (deadline) taskData.dueDate = new Date(deadline);

  const task = await Task.create(taskData);
  await task.populate('createdBy', 'username profile.firstName profile.lastName');

  // 添加活动日志
  await task.addActivityLog('created', req.user.id, `基于AI规划方案创建任务`);

  res.status(201).json({
    success: true,
    message: '基于AI规划的任务创建成功',
    data: { 
      task,
      selectedPlan: selectedPlan
    }
  });
});

/**
 * 获取任务详情
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    $or: [
      { createdBy: userId },
      { assignedTo: userId }
    ]
  }).populate([
    { path: 'createdBy', select: 'username profile.firstName profile.lastName' },
    { path: 'assignedTo', select: 'username profile.firstName profile.lastName' },
    { path: 'dependencies', select: 'title status priority' },
    { path: 'comments.author', select: 'username profile.firstName profile.lastName' },
    { path: 'activityLog.user', select: 'username' }
  ]);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务未找到或无权访问'
    });
  }

  res.status(200).json({
    success: true,
    data: { task }
  });
});

/**
 * 更新任务
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const updateData = req.body;

  // 查找任务
  const task = await Task.findOne({
    _id: taskId,
    $or: [
      { createdBy: userId },
      { assignedTo: userId }
    ]
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务未找到或无权限修改'
    });
  }

  // 记录变更
  const changes = [];
  const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'progress', 'tags'];
  
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined && updateData[field] !== task[field]) {
      changes.push(`${field}: ${task[field]} -> ${updateData[field]}`);
      task[field] = updateData[field];
    }
  });

  await task.save();

  // 添加活动日志
  if (changes.length > 0) {
    await task.addActivityLog('updated', userId, `更新字段: ${changes.join(', ')}`);
  }

  await task.populate([
    { path: 'createdBy', select: 'username profile.firstName profile.lastName' },
    { path: 'assignedTo', select: 'username profile.firstName profile.lastName' }
  ]);

  res.status(200).json({
    success: true,
    message: '任务更新成功',
    data: { task }
  });
});

/**
 * 删除任务
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const task = await Task.findOne({
    _id: taskId,
    createdBy: userId // 只有创建者可以删除
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务未找到或无权限删除'
    });
  }

  await task.deleteOne();

  res.status(200).json({
    success: true,
    message: '任务删除成功'
  });
});

/**
 * 获取用户任务统计
 * @route   GET /api/tasks/stats
 * @access  Private
 */
const getTaskStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const stats = await Task.getUserTaskStats(userId);

  // 获取本月创建的任务数
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const thisMonthTasks = await Task.countDocuments({
    $or: [{ createdBy: userId }, { assignedTo: userId }],
    createdAt: { $gte: currentMonth }
  });

  // 获取即将到期的任务（7天内）
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const upcomingTasks = await Task.find({
    $or: [{ createdBy: userId }, { assignedTo: userId }],
    dueDate: { 
      $gte: new Date(),
      $lte: sevenDaysLater 
    },
    status: { $nin: ['completed', 'cancelled'] }
  }).select('title dueDate priority').sort({ dueDate: 1 }).limit(5);

  res.status(200).json({
    success: true,
    data: {
      ...stats,
      thisMonth: thisMonthTasks,
      upcomingDeadlines: upcomingTasks
    }
  });
});

/**
 * 添加任务评论
 * @route   POST /api/tasks/:id/comments
 * @access  Private
 */
const addTaskComment = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供评论内容'
    });
  }

  const task = await Task.findOne({
    _id: taskId,
    $or: [
      { createdBy: userId },
      { assignedTo: userId }
    ]
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: '任务未找到或无权限评论'
    });
  }

  task.comments.push({
    author: userId,
    content: content.trim()
  });

  await task.save();
  await task.addActivityLog('commented', userId, '添加了评论');

  await task.populate('comments.author', 'username profile.firstName profile.lastName');

  res.status(200).json({
    success: true,
    message: '评论添加成功',
    data: {
      comment: task.comments[task.comments.length - 1]
    }
  });
});

/**
 * 为特定任务生成AI执行计划
 * @route   POST /api/tasks/:id/generate-plans
 * @access  Private
 */
const generateTaskExecutionPlans = asyncHandler(async (req, res) => {
  const taskId = req.params.id;
  
  try {
    // 获取任务信息
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    // 检查权限——任务创建者或分配者可以生成计划
    if (task.createdBy.toString() !== req.user.id && 
        task.assignedTo && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '无权为这个任务生成计划'
      });
    }

    // 获取用户职位信息
    const user = await User.findById(req.user.id);
    const userPosition = user.profile?.position || '员工';
    
    // 构建任务描述
    const taskDescription = `${task.title}: ${task.description}`;
    
    // 调用AI服务生成规划
    const aiPlans = await aiService.generateTaskPlanning(
      taskDescription,
      userPosition,
      task.dueDate
    );

    if (!aiPlans || aiPlans.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'AI规划生成失败，请稍后重试'
      });
    }

    // 将AI生成的计划转换为适合前端的格式
    const executionPlans = aiPlans.map(plan => ({
      planName: plan.title,
      description: plan.content,
      estimatedTime: '根据计划而定',
      resources: ['团队成员', '必要工具'],
      steps: plan.content.includes('\n-') ? 
        plan.content.split('\n-').slice(1).map(step => step.trim()) : 
        ['执行计划中的步骤']
    }));

    // 更新任务记录中的执行计划
    task.executionPlans = executionPlans;
    await task.save();

    // 记录活动日志
    await task.addActivityLog('ai_planning', req.user.id, `AI生成了${executionPlans.length}个执行计划`);

    res.status(200).json({
      success: true,
      message: `成功生成${executionPlans.length}个执行计划`,
      executionPlans,
      taskId: task._id,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('生成任务执行计划失败:', error);
    res.status(500).json({
      success: false,
      message: `生成执行计划失败: ${error.message}`
    });
  }
});

module.exports = {
  getTasks,
  createTask,
  generateTaskPlanning,
  createTaskFromAI,
  getTask,
  updateTask,
  deleteTask,
  getTaskStats,
  addTaskComment,
  generateTaskExecutionPlans
};