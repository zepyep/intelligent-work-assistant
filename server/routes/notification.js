const express = require('express');
const {
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
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// 用户通知路由
router.get('/', getUserNotifications);                    // 获取通知列表
router.get('/unread-count', getUnreadCount);              // 获取未读数量
router.get('/stats', getNotificationStats);               // 获取统计信息
router.get('/:id', getNotificationById);                  // 获取通知详情

router.put('/preferences', updateNotificationPreferences); // 更新通知偏好
router.put('/:id/read', markAsRead);                       // 标记单个已读
router.put('/read-multiple', markMultipleAsRead);          // 批量标记已读

router.delete('/:id', deleteNotification);                // 删除通知

// 管理员专用路由
router.use(authorize('admin', 'moderator'));

router.post('/', createNotification);                     // 创建单个通知
router.post('/bulk', createBulkNotifications);            // 批量创建通知
router.post('/:id/send', sendNotification);               // 手动发送通知
router.post('/process-pending', processPendingNotifications); // 处理待发送通知
router.post('/retry-failed', retryFailedNotifications);   // 重试失败通知

module.exports = router;