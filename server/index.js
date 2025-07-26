const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const documentRoutes = require('./routes/documents');
const meetingRoutes = require('./routes/meetings');
const calendarRoutes = require('./routes/calendar');
const wechatRoutes = require('./routes/wechat');
const wechatAdminRoutes = require('./routes/wechat-admin');
const wechatConfigRoutes = require('./routes/wechat-config');
const aiRoutes = require('./routes/ai');
const notificationRoutes = require('./routes/notification');
const socialRoutes = require('./routes/social');

const app = express();

// 连接数据库
connectDB();

// 安全中间件
app.use(helmet());

// 跨域配置
const corsConfig = require('./config/cors');
app.use(cors(corsConfig));

// 速率限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP每15分钟100次请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use('/api', limiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// API文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '智能工作助手服务运行正常',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/wechat', wechatRoutes);
app.use('/api/wechat-admin', wechatAdminRoutes);
app.use('/api/wechat-config', wechatConfigRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/social', socialRoutes);

// 微信公众号 webhook（需要在根路径）
app.use('/wechat', require('./routes/wechat-webhook'));

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路径 ${req.originalUrl} 不存在`
  });
});

// 全局错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 智能工作助手服务器启动成功`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api-docs`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ 进程ID: ${process.pid}`);
  
  // 初始化微信公众号菜单
  try {
    const { initializeWechatMenu } = require('./services/wechatMenuService');
    await initializeWechatMenu();
  } catch (error) {
    console.log('⚠️  微信菜单初始化跳过:', error.message);
  }
  
  // 初始化通知调度器
  try {
    const SchedulerService = require('./services/schedulerService');
    global.schedulerService = new SchedulerService();
    await global.schedulerService.initialize();
  } catch (error) {
    console.log('⚠️  通知调度器初始化跳过:', error.message);
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在优雅关闭服务器...');
  
  // 停止调度器
  if (global.schedulerService) {
    global.schedulerService.stopAll();
  }
  
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在优雅关闭服务器...');
  
  // 停止调度器
  if (global.schedulerService) {
    global.schedulerService.stopAll();
  }
  
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 未处理的Promise拒绝
process.on('unhandledRejection', (err, promise) => {
  console.error('未处理的Promise拒绝:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;