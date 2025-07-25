const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 基础用户路由（占位）
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '用户管理API',
    data: {
      userId: req.user.id,
      username: req.user.username
    }
  });
});

module.exports = router;