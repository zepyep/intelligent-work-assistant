const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadConfigs } = require('../config/multer');
const meetingController = require('../controllers/meetingController');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 会议基础路由
router
  .route('/')
  .get(meetingController.getMeetings)
  .post(meetingController.createMeeting);

// 单个会议路由
router
  .route('/:id')
  .get(meetingController.getMeeting);

// 会议音频上传
router.post('/:id/audio', uploadConfigs.meeting, meetingController.uploadAudio);

// 获取转录结果
router.get('/:id/transcription', meetingController.getTranscription);

// 获取个性化行动清单
router.get('/:id/action-items', meetingController.getActionItems);

// 更新行动项状态
router.put('/:id/action-items/:itemId', meetingController.updateActionItem);

// 重新分析会议
router.post('/:id/reanalyze', meetingController.reanalyzeMeeting);

module.exports = router;