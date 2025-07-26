const Calendar = require('../models/Calendar');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Task = require('../models/Task');
const calendarSyncService = require('../services/calendarSyncService');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../middleware/errorHandler');

// @desc    获取用户日程事件
// @route   GET /api/calendar/events
// @access  Private
exports.getEvents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    startDate,
    endDate,
    eventType,
    priority,
    search,
    view = 'month' // month, week, day, agenda
  } = req.query;

  // 构建查询条件
  const query = {
    $or: [
      { owner: req.user._id },
      { 'participants.user': req.user._id }
    ]
  };

  // 时间范围过滤
  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = new Date(startDate);
    if (endDate) query.startTime.$lte = new Date(endDate);
  } else {
    // 默认显示未来30天的事件
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    query.startTime = { $gte: now, $lte: futureDate };
  }

  // 其他过滤条件
  if (eventType) query.eventType = eventType;
  if (priority) query.priority = priority;
  
  if (search) {
    query.$text = { $search: search };
  }

  const events = await Calendar.find(query)
    .populate('owner', 'username profile.fullName profile.position')
    .populate('participants.user', 'username profile.fullName')
    .populate('relatedItems.itemId')
    .sort({ startTime: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

  const total = await Calendar.countDocuments(query);

  // 根据视图类型组织数据
  let organizedEvents = events;
  if (view === 'week' || view === 'month') {
    organizedEvents = organizeEventsByView(events, view, startDate);
  }

  res.status(200).json({
    success: true,
    data: {
      events: organizedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      view,
      dateRange: { startDate, endDate }
    }
  });
});

// @desc    创建日程事件
// @route   POST /api/calendar/events
// @access  Private
exports.createEvent = asyncHandler(async (req, res) => {
  const eventData = {
    ...req.body,
    owner: req.user._id,
    metadata: { createdVia: 'web' }
  };

  // 验证时间范围
  if (new Date(eventData.startTime) >= new Date(eventData.endTime)) {
    return res.status(400).json({
      success: false,
      message: '开始时间必须早于结束时间'
    });
  }

  const event = await Calendar.create(eventData);
  await event.populate('owner', 'username profile.fullName');

  // 自动同步到外部日历
  if (req.body.autoSync !== false) {
    try {
      await calendarSyncService.syncEventToExternal(event._id);
    } catch (error) {
      console.error('自动同步失败:', error);
    }
  }

  res.status(201).json({
    success: true,
    message: '日程事件创建成功',
    data: { event }
  });
});

// @desc    更新日程事件
// @route   PUT /api/calendar/events/:id
// @access  Private
exports.updateEvent = asyncHandler(async (req, res, next) => {
  const event = await Calendar.findById(req.params.id);

  if (!event) {
    return next(new ErrorResponse('事件不存在', 404));
  }

  // 检查权限
  if (event.owner.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('无权修改此事件', 403));
  }

  // 验证时间范围
  if (req.body.startTime && req.body.endTime) {
    if (new Date(req.body.startTime) >= new Date(req.body.endTime)) {
      return res.status(400).json({
        success: false,
        message: '开始时间必须早于结束时间'
      });
    }
  }

  Object.assign(event, req.body);
  await event.save();

  // 同步更新到外部日历
  if (req.body.autoSync !== false && event.externalCalendars.length > 0) {
    try {
      await calendarSyncService.syncEventToExternal(event._id);
    } catch (error) {
      console.error('同步更新失败:', error);
    }
  }

  res.status(200).json({
    success: true,
    message: '事件更新成功',
    data: { event }
  });
});

// @desc    删除日程事件
// @route   DELETE /api/calendar/events/:id
// @access  Private
exports.deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Calendar.findById(req.params.id);

  if (!event) {
    return next(new ErrorResponse('事件不存在', 404));
  }

  // 检查权限
  if (event.owner.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('无权删除此事件', 403));
  }

  await event.deleteOne();

  res.status(200).json({
    success: true,
    message: '事件删除成功'
  });
});

// @desc    获取可用的时间段
// @route   GET /api/calendar/availability
// @access  Private
exports.getAvailability = asyncHandler(async (req, res) => {
  const { date, duration = 60, participants = [] } = req.query;
  
  if (!date) {
    return res.status(400).json({
      success: false,
      message: '请提供查询日期'
    });
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(9, 0, 0, 0); // 9:00 AM
  const endOfDay = new Date(date);
  endOfDay.setHours(17, 0, 0, 0); // 5:00 PM

  // 获取当天的忙碌时间段
  const participantIds = [req.user._id, ...participants];
  const busyEvents = await Calendar.find({
    $or: [
      { owner: { $in: participantIds } },
      { 'participants.user': { $in: participantIds } }
    ],
    startTime: { $lt: endOfDay },
    endTime: { $gt: startOfDay },
    status: { $ne: 'cancelled' }
  }).select('startTime endTime title');

  // 计算可用时间段
  const availableSlots = calculateAvailableSlots(
    startOfDay, 
    endOfDay, 
    busyEvents, 
    parseInt(duration)
  );

  res.status(200).json({
    success: true,
    data: {
      date,
      duration: parseInt(duration),
      availableSlots,
      busyEvents: busyEvents.map(event => ({
        id: event._id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime
      }))
    }
  });
});

// @desc    批量导入事件
// @route   POST /api/calendar/import
// @access  Private
exports.importEvents = asyncHandler(async (req, res) => {
  const { provider, dateRange } = req.body;

  if (!provider || !['google', 'outlook'].includes(provider)) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的日历提供商 (google/outlook)'
    });
  }

  try {
    const importedEvents = await calendarSyncService.importEventsFromExternal(
      req.user._id,
      provider,
      dateRange
    );

    res.status(200).json({
      success: true,
      message: `成功从 ${provider} 导入 ${importedEvents.length} 个事件`,
      data: { 
        importedCount: importedEvents.length,
        events: importedEvents
      }
    });
  } catch (error) {
    console.error('导入事件失败:', error);
    res.status(500).json({
      success: false,
      message: `从 ${provider} 导入事件失败: ${error.message}`
    });
  }
});

// @desc    获取外部日历授权URL
// @route   GET /api/calendar/auth/:provider
// @access  Private
exports.getAuthUrl = asyncHandler(async (req, res, next) => {
  const { provider } = req.params;

  if (!['google', 'outlook'].includes(provider)) {
    return next(new ErrorResponse('不支持的日历提供商', 400));
  }

  try {
    let authUrl;
    if (provider === 'google') {
      authUrl = calendarSyncService.getGoogleAuthUrl(req.user._id);
    } else if (provider === 'outlook') {
      authUrl = calendarSyncService.getMicrosoftAuthUrl(req.user._id);
    }

    res.status(200).json({
      success: true,
      data: {
        provider,
        authUrl,
        message: '请在浏览器中打开此URL完成授权'
      }
    });
  } catch (error) {
    console.error('获取授权URL失败:', error);
    res.status(500).json({
      success: false,
      message: `获取 ${provider} 授权URL失败: ${error.message}`
    });
  }
});

// @desc    处理外部日历授权回调
// @route   GET /api/calendar/auth/:provider/callback
// @access  Public (需要通过 state 参数验证用户)
exports.handleAuthCallback = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state: userId, error } = req.query;

  if (error) {
    return res.status(400).json({
      success: false,
      message: `授权失败: ${error}`
    });
  }

  if (!code || !userId) {
    return res.status(400).json({
      success: false,
      message: '缺少必要的授权参数'
    });
  }

  try {
    let result;
    if (provider === 'google') {
      result = await calendarSyncService.handleGoogleCallback(code, userId);
    } else if (provider === 'outlook') {
      result = await calendarSyncService.handleMicrosoftCallback(code, userId);
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的日历提供商'
      });
    }

    res.status(200).json({
      success: true,
      message: `${provider} 日历集成成功`,
      data: result
    });
  } catch (error) {
    console.error('处理授权回调失败:', error);
    res.status(500).json({
      success: false,
      message: `${provider} 日历集成失败: ${error.message}`
    });
  }
});

// @desc    手动同步事件到外部日历
// @route   POST /api/calendar/events/:id/sync
// @access  Private
exports.syncEvent = asyncHandler(async (req, res, next) => {
  const { providers = ['google', 'outlook'] } = req.body;
  
  const event = await Calendar.findById(req.params.id);
  if (!event) {
    return next(new ErrorResponse('事件不存在', 404));
  }

  // 检查权限
  if (event.owner.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('无权同步此事件', 403));
  }

  try {
    const syncResults = await calendarSyncService.syncEventToExternal(
      req.params.id,
      providers
    );

    res.status(200).json({
      success: true,
      message: '事件同步完成',
      data: {
        eventId: req.params.id,
        syncResults
      }
    });
  } catch (error) {
    console.error('同步事件失败:', error);
    res.status(500).json({
      success: false,
      message: `同步失败: ${error.message}`
    });
  }
});

// @desc    获取用户的日历集成状态
// @route   GET /api/calendar/integrations
// @access  Private
exports.getIntegrations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('calendarIntegrations');
  
  const integrations = user.calendarIntegrations.map(integration => ({
    provider: integration.provider,
    isActive: integration.isActive,
    connectedAt: integration.connectedAt,
    expiresAt: integration.expiresAt,
    isExpired: integration.expiresAt < new Date()
  }));

  res.status(200).json({
    success: true,
    data: { integrations }
  });
});

// @desc    禁用日历集成
// @route   DELETE /api/calendar/integrations/:provider
// @access  Private
exports.disableIntegration = asyncHandler(async (req, res, next) => {
  const { provider } = req.params;

  if (!['google', 'outlook'].includes(provider)) {
    return next(new ErrorResponse('不支持的日历提供商', 400));
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { calendarIntegrations: { provider } }
  });

  res.status(200).json({
    success: true,
    message: `${provider} 日历集成已禁用`
  });
});

// @desc    导出日历为 iCal 格式
// @route   GET /api/calendar/export
// @access  Private
exports.exportCalendar = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const icalData = await calendarSyncService.generateICalendar(req.user._id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(icalData);
  } catch (error) {
    console.error('导出日历失败:', error);
    res.status(500).json({
      success: false,
      message: `导出日历失败: ${error.message}`
    });
  }
});

// @desc    获取日程统计信息
// @route   GET /api/calendar/stats
// @access  Private
exports.getStats = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  
  let startDate, endDate;
  const now = new Date();
  
  if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
  }

  const stats = await Calendar.aggregate([
    {
      $match: {
        owner: req.user._id,
        startTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        totalDuration: { $sum: { $subtract: ['$endTime', '$startTime'] } },
        eventsByType: { $push: '$eventType' },
        eventsByPriority: { $push: '$priority' }
      }
    }
  ]);

  const result = stats[0] || { totalEvents: 0, totalDuration: 0 };
  
  // 按类型统计
  const typeStats = {};
  const priorityStats = {};
  
  if (result.eventsByType) {
    result.eventsByType.forEach(type => {
      typeStats[type] = (typeStats[type] || 0) + 1;
    });
  }
  
  if (result.eventsByPriority) {
    result.eventsByPriority.forEach(priority => {
      priorityStats[priority] = (priorityStats[priority] || 0) + 1;
    });
  }

  res.status(200).json({
    success: true,
    data: {
      period,
      totalEvents: result.totalEvents,
      totalDuration: Math.round(result.totalDuration / (1000 * 60)), // 转换为分钟
      averageDuration: result.totalEvents > 0 
        ? Math.round(result.totalDuration / (1000 * 60 * result.totalEvents))
        : 0,
      eventsByType: typeStats,
      eventsByPriority: priorityStats,
      dateRange: { startDate, endDate }
    }
  });
});

// 内部函数：根据视图类型组织事件
function organizeEventsByView(events, view, startDate) {
  if (view === 'month') {
    const organizedEvents = {};
    events.forEach(event => {
      const dateKey = event.startTime.toISOString().split('T')[0];
      if (!organizedEvents[dateKey]) {
        organizedEvents[dateKey] = [];
      }
      organizedEvents[dateKey].push(event);
    });
    return organizedEvents;
  }
  
  return events;
}

// 内部函数：计算可用时间段
function calculateAvailableSlots(startTime, endTime, busyEvents, duration) {
  const slots = [];
  let currentTime = new Date(startTime);

  // 按开始时间排序忙碌事件
  busyEvents.sort((a, b) => a.startTime - b.startTime);

  for (const busyEvent of busyEvents) {
    // 检查当前时间与忙碌事件开始时间之间是否有可用槽位
    if (currentTime < busyEvent.startTime) {
      const availableDuration = (busyEvent.startTime - currentTime) / (1000 * 60);
      if (availableDuration >= duration) {
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(Math.min(
            currentTime.getTime() + duration * 60 * 1000,
            busyEvent.startTime
          )),
          duration: Math.min(availableDuration, duration)
        });
      }
    }
    
    // 更新当前时间到忙碌事件结束时间
    currentTime = new Date(Math.max(currentTime, busyEvent.endTime));
  }

  // 检查最后一个忙碌事件后是否还有可用时间
  if (currentTime < endTime) {
    const availableDuration = (endTime - currentTime) / (1000 * 60);
    if (availableDuration >= duration) {
      slots.push({
        startTime: new Date(currentTime),
        endTime: new Date(Math.min(
          currentTime.getTime() + duration * 60 * 1000,
          endTime
        )),
        duration: Math.min(availableDuration, duration)
      });
    }
  }

  return slots;
}