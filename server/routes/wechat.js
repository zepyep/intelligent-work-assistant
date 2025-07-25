const express = require('express');
const { 
  generateBindingCode,
  verifyBindingCode,
  getBindingStatus,
  unbindWechat,
  getWechatProfile,
  sendWechatMessage,
  handleWebhook
} = require('../controllers/wechatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 公开路由（微信服务器调用）
router.post('/bind/verify', verifyBindingCode);

// 微信消息webhook处理（GET用于URL验证，POST用于接收消息）
router.all('/webhook', handleWebhook);

// 需要认证的路由
router.use(protect);

// 微信账号绑定
router.post('/bind/generate', generateBindingCode);
router.get('/bind/status', getBindingStatus);
router.delete('/bind', unbindWechat);

// 微信用户信息
router.get('/profile', getWechatProfile);

// 发送微信消息（管理员功能）
router.post('/send-message', sendWechatMessage);

module.exports = router;