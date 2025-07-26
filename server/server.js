require('dotenv').config();

const connectDB = require('./config/database');

// Create Express app
const createApp = () => {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');

  const errorHandler = require('./middleware/errorHandler');
  
  // Skip Swagger in test environment
  let specs, swaggerUi, swaggerOptions;
  if (process.env.NODE_ENV !== 'test') {
    const swaggerConfig = require('./config/swagger');
    specs = swaggerConfig.specs;
    swaggerUi = swaggerConfig.swaggerUi;
    swaggerOptions = swaggerConfig.swaggerOptions;
  }

  const app = express();

  // Connect to database (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    connectDB();
  }

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }));

  // Rate limiting (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
      message: {
        error: '请求过于频繁，请稍后再试'
      }
    });
    app.use('/api', limiter);
  }

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static file serving
  app.use('/uploads', express.static('uploads'));

  // API Documentation (skip in test environment)
  if (process.env.NODE_ENV !== 'test' && specs && swaggerUi) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));
    app.get('/api/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      message: '智能工作助手服务运行正常',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/documents', require('./routes/documents'));
  app.use('/api/meetings', require('./routes/meetings'));
  app.use('/api/calendar', require('./routes/calendar'));
  app.use('/api/wechat', require('./routes/wechat'));
  app.use('/api/wechat-admin', require('./routes/wechat-admin'));
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api/notifications', require('./routes/notification'));

  // WeChat webhook (needs to be at root path)
  app.use('/wechat', require('./routes/wechat-webhook'));

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `路径 ${req.originalUrl} 不存在`
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};

module.exports = createApp;