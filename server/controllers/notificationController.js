const NotificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 获取用户通知列表
 * @route   GET /api/notifications
 * @access  Private
 */
const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    status, 
    type, 
    unreadOnly, 
    page = 1, 
    limit = 20 
  } = req.query;

  const skip = (page - 1) * limit;
  const options = {
    status,
    type,
    unreadOnly: unreadOnly === 'true',
    limit: parseInt(limit),
    skip: parseInt(skip)
  };

  const notifications = await NotificationService.getUserNotifications(userId, options);
  
  // 获取总数
  const totalQuery = { 'recipient.userId': userId };
  if (status) totalQuery.status = status;
  if (type) totalQuery.type = type;
  if (unreadOnly === 'true') totalQuery['channels.web.read'] = { $ne: true };
  
  const total = await Notification.countDocuments(totalQuery);
  const totalPages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    message: '获取通知列表成功',
    data: {
      notifications,
      pagination: {
        current: parseInt(page),
        total: totalPages,
        limit: parseInt(limit),
        totalItems: total
      }
    }
  });
});

/**
 * 获取未读通知数量
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const unreadCount = await Notification.countDocuments({
    'recipient.userId': userId,
    'channels.web.read': { $ne: true },
    status: { $in: ['pending', 'sent', 'delivered'] }
  });

  res.status(200).json({
    success: true,
    data: { unreadCount }
  });
});

/**
 * 标记通知为已读
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  const notification = await NotificationService.markAsRead(notificationId, userId);

  res.status(200).json({
    success: true,
    message: '通知已标记为已读',
    data: { notification }
  });
});

/**
 * 批量标记通知为已读
 * @route   PUT /api/notifications/read-multiple
 * @access  Private
 */
const markMultipleAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { notificationIds } = req.body; // 可选，为空则标记所有未读

  const modifiedCount = await NotificationService.markMultipleAsRead(userId, notificationIds);

  res.status(200).json({
    success: true,
    message: `成功标记 ${modifiedCount} 个通知为已读`,
    data: { modifiedCount }
  });
});

/**
 * 创建通知 (管理员功能)
 * @route   POST /api/notifications
 * @access  Private (Admin)
 */
const createNotification = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    type,
    userId,
    priority,
    scheduledFor,
    relatedData
  } = req.body;

  if (!title || !content || !type || !userId) {
    return res.status(400).json({
      success: false,
      message: '标题、内容、类型和接收者不能为空'
    });
  }

  const notification = await NotificationService.createNotification({
    title,
    content,
    type,
    userId
  }, {
    priority,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    relatedData,
    source: 'admin',
    userAgent: req.get('User-Agent'),
    clientIp: req.ip
  });

  res.status(201).json({
    success: true,
    message: '通知创建成功',
    data: { notification }
  });
});

/**
 * 批量创建通知 (管理员功能)
 * @route   POST /api/notifications/bulk
 * @access  Private (Admin)
 */
const createBulkNotifications = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    type,
    userIds,
    priority = 'normal'
  } = req.body;

  if (!title || !content || !type || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '标题、内容、类型和接收者列表不能为空'
    });
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const userId of userIds) {
    try {
      const notification = await NotificationService.createNotification({
        title,
        content,
        type,
        userId
      }, {
        priority,
        source: 'admin_bulk',
        userAgent: req.get('User-Agent'),
        clientIp: req.ip
      });

      results.push({
        userId,
        success: true,
        notificationId: notification._id
      });
      successCount++;
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error.message
      });
      failCount++;
    }
  }

  res.status(201).json({
    success: true,
    message: `批量创建通知完成: 成功 ${successCount}, 失败 ${failCount}`,
    data: {
      results,
      summary: { successCount, failCount, total: userIds.length }
    }
  });
});

/**
 * 手动触发通知发送
 * @route   POST /api/notifications/:id/send
 * @access  Private (Admin)
 */
const sendNotification = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;

  const success = await NotificationService.sendNotification(notificationId);

  res.status(200).json({
    success,
    message: success ? '通知发送成功' : '通知暂不符合发送条件'
  });
});

/**
 * 处理所有待发送通知
 * @route   POST /api/notifications/process-pending
 * @access  Private (Admin)
 */
const processPendingNotifications = asyncHandler(async (req, res) => {
  const result = await NotificationService.processPendingNotifications();

  res.status(200).json({
    success: true,
    message: '待发送通知处理完成',
    data: result
  });
});

/**
 * 重试失败的通知
 * @route   POST /api/notifications/retry-failed
 * @access  Private (Admin)
 */
const retryFailedNotifications = asyncHandler(async (req, res) => {
  const retryCount = await NotificationService.retryFailedNotifications();

  res.status(200).json({
    success: true,
    message: `重试完成，处理了 ${retryCount} 个失败通知`,
    data: { retryCount }
  });
});

/**
 * 删除通知
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    'recipient.userId': userId
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: '通知不存在或无权删除'
    });
  }

  res.status(200).json({
    success: true,
    message: '通知删除成功'
  });
});

/**
 * 获取通知统计信息
 * @route   GET /api/notifications/stats
 * @access  Private
 */
const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { global } = req.query; // 管理员可以获取全局统计

  const isAdmin = req.user.role === 'admin' && global === 'true';
  const statsUserId = isAdmin ? null : userId;

  const stats = await NotificationService.getNotificationStats(statsUserId);

  res.status(200).json({
    success: true,
    message: '获取统计信息成功',
    data: { stats }
  });
});

/**
 * 获取通知详情
 * @route   GET /api/notifications/:id
 * @access  Private
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  const notification = await Notification.findOne({
    _id: notificationId,
    'recipient.userId': userId
  }).populate([
    { path: 'relatedData.taskId', select: 'title status priority dueDate' },
    { path: 'relatedData.meetingId', select: 'title date location' },
    { path: 'relatedData.documentId', select: 'originalName fileType uploadDate' },
    { path: 'relatedData.calendarEventId', select: 'title startTime endTime' }
  ]);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: '通知不存在或无权访问'
    });
  }

  // 如果是首次查看，标记为已读
  if (!notification.channels.web.read) {
    await notification.markAsRead();
  }

  res.status(200).json({
    success: true,
    message: '获取通知详情成功',
    data: { notification }
  });
});

/**
 * 更新通知偏好设置
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { notifications } = req.body;

  if (!notifications || typeof notifications !== 'object') {
    return res.status(400).json({
      success: false,
      message: '通知偏好设置格式错误'
    });
  }

  // 更新用户偏好设置
  const User = require('../models/User');
  await User.findByIdAndUpdate(userId, {
    'preferences.notifications': notifications
  });

  res.status(200).json({
    success: true,
    message: '通知偏好设置更新成功'
  });
});

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  createNotification,
  createBulkNotifications,
  sendNotification,
  processPendingNotifications,
  retryFailedNotifications,
  deleteNotification,
  getNotificationStats,
  getNotificationById,
  updateNotificationPreferences
};