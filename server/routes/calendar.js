const express = require('express');
const { protect } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

const router = express.Router();

// 授权回调 - 不需要认证（在 protect 之前）
router.get('/auth/:provider/callback', calendarController.handleAuthCallback);

// 所有其他路由都需要认证
router.use(protect);

// 日程事件管理
router
  .route('/events')
  .get(calendarController.getEvents)
  .post(calendarController.createEvent);

router
  .route('/events/:id')
  .put(calendarController.updateEvent)
  .delete(calendarController.deleteEvent);

// 手动同步单个事件
router.post('/events/:id/sync', calendarController.syncEvent);

// 时间可用性查询
router.get('/availability', calendarController.getAvailability);

// 外部日历集成
router
  .route('/integrations')
  .get(calendarController.getIntegrations);

router.delete('/integrations/:provider', calendarController.disableIntegration);

// 外部日历授权
router.get('/auth/:provider', calendarController.getAuthUrl);



// 批量导入和同步
router.post('/import', calendarController.importEvents);

// 日历导出
router.get('/export', calendarController.exportCalendar);

// 日程统计
router.get('/stats', calendarController.getStats);

module.exports = router;