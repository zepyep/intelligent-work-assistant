const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/database');
const swaggerConfig = require('./config/swagger');
const securityConfig = require('./config/security');
const corsConfig = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const { applySecurityMiddleware, rateLimits } = require('./middleware/securityMiddleware');
const { auditLogger } = require('./middleware/accessControl');
const { createSecurityMonitorMiddleware, createSecurityStatsMiddleware } = require('./middleware/securityMonitor');

// Create Express app
const app = express();

// Trust proxy for correct IP detection
app.set('trust proxy', 1);

// Database Connection (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  
  // Validate security configuration
  try {
    securityConfig.validateConfiguration();
  } catch (error) {
    console.error('Security configuration validation failed:', error.message);
    process.exit(1);
  }
}

// Cookie parser (needed for session management)
app.use(cookieParser());

// Apply comprehensive security middleware
if (process.env.NODE_ENV !== 'test') {
  applySecurityMiddleware(app);
  
  // Apply advanced security monitoring
  app.use(createSecurityMonitorMiddleware());
}

// Basic security headers (always applied)
app.use(helmet({
  contentSecurityPolicy: {
    directives: securityConfig.csp.directives
  },
  hsts: securityConfig.https.hsts,
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// CORS configuration - 支持 Clacky 环境
app.use(cors(corsConfig));

// Audit logging for security monitoring
if (process.env.NODE_ENV !== 'test') {
  app.use(auditLogger);
}

// Body parsing with security limits
app.use(express.json({ 
  limit: process.env.NODE_ENV === 'test' ? '10mb' : '5mb',
  verify: (req, res, buf) => {
    // Store raw body for signature verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.NODE_ENV === 'test' ? '10mb' : '5mb'
}));

// Swagger Documentation (skip in test)
if (process.env.NODE_ENV !== 'test') {
  const specs = swaggerJsdoc(swaggerConfig);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Intelligent Work Assistant API Documentation'
  }));
}

// Routes with specific security middleware

// Authentication routes with strict rate limiting
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', rateLimits.moderate);
}
app.use('/api/auth', require('./routes/auth'));

// File upload routes with upload-specific limits
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/upload', rateLimits.upload);
}
app.use('/api/upload', require('./routes/upload'));

// AI-powered routes with AI-specific limits
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/tasks/ai-planning', rateLimits.ai);
  app.use('/api/documents/:id/analyze', rateLimits.ai);
  app.use('/api/meetings/:id/reanalyze', rateLimits.ai);
}

// Standard API routes with general rate limiting (applied in securityMiddleware)
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/wechat', require('./routes/wechat'));

// Web scraping routes with general rate limiting
app.use('/api/web', require('./routes/webScraping'));

// AI analysis routes
app.use('/api/ai', require('./routes/ai'));

// Social networking routes
try {
  console.log('👥 加载社交功能路由...');
  const socialRoutes = require('./routes/social');
  app.use('/api/social', socialRoutes);
  console.log('✅ 社交功能路由加载成功');
} catch (error) {
  console.error('❌ 社交功能路由加载失败:', error.message);
}

// Enhanced AI routes with AI-specific rate limiting
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/ai/enhanced', rateLimits.ai);
}
app.use('/api/ai/enhanced', require('./routes/enhancedAi'));

// Admin routes with strict limitations
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/admin', rateLimits.strict);
  app.use('/api/wechat-admin', rateLimits.strict);
  app.use('/api/system', rateLimits.strict);
}
app.use('/api/admin', require('./routes/admin') || ((req, res) => res.status(404).json({ error: 'Admin routes not implemented' })));
app.use('/api/wechat-admin', require('./routes/wechat-admin') || ((req, res) => res.status(404).json({ error: 'WeChat admin routes not implemented' })));
app.use('/api/system', require('./routes/system') || ((req, res) => res.status(404).json({ error: 'System routes not implemented' })));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Security statistics endpoint (admin only)
app.get('/api/security/stats', createSecurityStatsMiddleware(), (req, res) => {
  if (!req.securityStats) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - Admin access required'
    });
  }
  
  res.json({
    success: true,
    data: req.securityStats,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🤖 智能工作助手 API 服务运行中',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;