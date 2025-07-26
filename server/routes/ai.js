const express = require('express');
const {
  getProviders,
  switchProvider,
  testProvider,
  chat,
  generateTaskPlanning,
  executePlan,
  analyzeDocument,
  analyzeMeeting,
  batchProcess
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 用户可用的AI功能
router.post('/chat', chat);
router.post('/task-planning', generateTaskPlanning);
router.post('/execute-plan', executePlan);
router.post('/document-analysis', analyzeDocument);
router.post('/meeting-analysis', analyzeMeeting);

// 管理员专用功能
router.get('/providers', authorize('admin', 'super_admin'), getProviders);
router.post('/providers/switch', authorize('admin', 'super_admin'), switchProvider);
router.post('/test', authorize('admin', 'super_admin'), testProvider);
router.post('/batch', authorize('admin', 'super_admin'), batchProcess);

module.exports = router;