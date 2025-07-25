const express = require('express');
const { handleWebhook } = require('../controllers/wechatController');
const rawParser = require('body-parser').raw({ type: 'text/xml' });

const router = express.Router();

// 微信webhook需要特殊的中间件处理XML数据
router.use(rawParser);

// 将原始XML转换为字符串
router.use((req, res, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.body = req.body.toString('utf8');
  }
  next();
});

// 使用新的comprehensive webhook handler
// GET用于微信服务器URL验证，POST用于接收消息
router.all('/', handleWebhook);

module.exports = router;