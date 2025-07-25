const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 日程同步路由（占位）
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '日程同步API',
    data: {
      message: '日程同步功能正在开发中...'
    }
  });
});

module.exports = router;