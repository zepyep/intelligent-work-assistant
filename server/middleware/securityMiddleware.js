const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const crypto = require('crypto');

/**
 * 综合安全中间件配置
 */

// 基础速率限制配置
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// 不同级别的速率限制
const securityLimits = {
  // 严格限制 - 敏感操作
  strict: createRateLimit(
    15 * 60 * 1000, // 15分钟
    5, // 5次请求
    '敏感操作过于频繁，请15分钟后再试'
  ),
  
  // 中等限制 - 认证相关
  moderate: createRateLimit(
    15 * 60 * 1000, // 15分钟
    20, // 20次请求
    '认证请求过于频繁，请15分钟后再试'
  ),
  
  // 一般限制 - 普通API
  general: createRateLimit(
    15 * 60 * 1000, // 15分钟
    100, // 100次请求
    '请求过于频繁，请稍后再试'
  ),
  
  // 文件上传限制
  upload: createRateLimit(\n    60 * 60 * 1000, // 1小时\n    50, // 50次上传\n    '文件上传过于频繁，请1小时后再试'\n  ),\n  \n  // AI服务限制\n  ai: createRateLimit(\n    60 * 60 * 1000, // 1小时\n    100, // 100次AI调用\n    'AI服务调用过于频繁，请1小时后再试'\n  )\n};\n\n// IP 白名单配置\nconst ipWhitelist = [\n  '127.0.0.1',\n  '::1',\n  'localhost'\n];\n\n// 检查IP白名单\nconst checkIPWhitelist = (req, res, next) => {\n  const clientIP = req.ip || \n    req.connection.remoteAddress || \n    req.socket.remoteAddress || \n    (req.connection.socket ? req.connection.socket.remoteAddress : null);\n    \n  if (process.env.ENABLE_IP_WHITELIST === 'true') {\n    const allowedIPs = process.env.ALLOWED_IPS ? \n      process.env.ALLOWED_IPs.split(',').map(ip => ip.trim()) : \n      ipWhitelist;\n      \n    if (!allowedIPs.includes(clientIP)) {\n      return res.status(403).json({\n        success: false,\n        error: 'IP地址不在白名单中',\n        code: 'IP_NOT_ALLOWED'\n      });\n    }\n  }\n  \n  next();\n};\n\n// 请求大小限制\nconst requestSizeLimit = (maxSize = '10mb') => {\n  return (req, res, next) => {\n    const contentLength = req.get('content-length');\n    if (contentLength) {\n      const sizeInMB = parseInt(contentLength) / (1024 * 1024);\n      const maxSizeNum = parseInt(maxSize.replace('mb', ''));\n      \n      if (sizeInMB > maxSizeNum) {\n        return res.status(413).json({\n          success: false,\n          error: `请求体过大，最大允许${maxSize}`,\n          code: 'PAYLOAD_TOO_LARGE'\n        });\n      }\n    }\n    next();\n  };\n};\n\n// 恶意请求检测\nconst detectMaliciousRequests = (req, res, next) => {\n  // 检测SQL注入尝试\n  const sqlInjectionPatterns = [\n    /('|(\\-\\-)|(;)|(\\||\\|)|(\\*|\\*))/i,\n    /(union|select|insert|delete|update|drop|create|alter)/i\n  ];\n  \n  // 检测XSS尝试\n  const xssPatterns = [\n    /<script[^>]*>.*?<\\/script>/gi,\n    /<iframe[^>]*>.*?<\\/iframe>/gi,\n    /javascript:/gi,\n    /on\\w+\\s*=/gi\n  ];\n  \n  const checkPatterns = (str, patterns) => {\n    return patterns.some(pattern => pattern.test(str));\n  };\n  \n  // 检查URL参数\n  const queryString = req.url.split('?')[1] || '';\n  if (checkPatterns(queryString, [...sqlInjectionPatterns, ...xssPatterns])) {\n    console.log(`🚨 恶意请求检测: ${req.ip} - ${req.url}`);\n    return res.status(400).json({\n      success: false,\n      error: '检测到潜在恶意请求',\n      code: 'MALICIOUS_REQUEST'\n    });\n  }\n  \n  // 检查请求体\n  if (req.body) {\n    const bodyStr = JSON.stringify(req.body);\n    if (checkPatterns(bodyStr, [...sqlInjectionPatterns, ...xssPatterns])) {\n      console.log(`🚨 恶意请求检测: ${req.ip} - 请求体包含可疑内容`);\n      return res.status(400).json({\n        success: false,\n        error: '检测到潜在恶意请求',\n        code: 'MALICIOUS_REQUEST'\n      });\n    }\n  }\n  \n  next();\n};\n\n// CSRF 保护\nconst csrfProtection = (req, res, next) => {\n  // 对于状态改变的请求（POST, PUT, DELETE, PATCH），检查CSRF token\n  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {\n    const token = req.headers['x-csrf-token'] || req.body._csrf;\n    const sessionToken = req.session?.csrfToken;\n    \n    // 在测试环境跳过CSRF检查\n    if (process.env.NODE_ENV === 'test') {\n      return next();\n    }\n    \n    if (!token || !sessionToken || token !== sessionToken) {\n      return res.status(403).json({\n        success: false,\n        error: 'CSRF token 无效或缺失',\n        code: 'INVALID_CSRF_TOKEN'\n      });\n    }\n  }\n  \n  next();\n};\n\n// 生成CSRF token\nconst generateCSRFToken = () => {\n  return crypto.randomBytes(32).toString('hex');\n};\n\n// 安全头部配置\nconst securityHeaders = helmet({\n  contentSecurityPolicy: {\n    directives: {\n      defaultSrc: [\"'self'\"],\n      styleSrc: [\"'self'\", \"'unsafe-inline'\", 'https://fonts.googleapis.com'],\n      fontSrc: [\"'self'\", 'https://fonts.gstatic.com'],\n      imgSrc: [\"'self'\", 'data:', 'https:'],\n      scriptSrc: [\"'self'\"],\n      connectSrc: [\"'self'\"],\n      frameSrc: [\"'none'\"],\n      objectSrc: [\"'none'\"],\n      upgradeInsecureRequests: []\n    }\n  },\n  hsts: {\n    maxAge: 31536000,\n    includeSubDomains: true,\n    preload: true\n  },\n  noSniff: true,\n  xssFilter: true,\n  referrerPolicy: { policy: 'same-origin' }\n});\n\n// API 密钥验证中间件\nconst apiKeyAuth = (req, res, next) => {\n  // 某些敏感API端点需要额外的API密钥\n  const sensitiveEndpoints = [\n    '/api/admin',\n    '/api/wechat-admin', \n    '/api/system'\n  ];\n  \n  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => \n    req.path.startsWith(endpoint)\n  );\n  \n  if (isSensitiveEndpoint) {\n    const apiKey = req.headers['x-api-key'];\n    const validApiKeys = process.env.ADMIN_API_KEYS ? \n      process.env.ADMIN_API_KEYS.split(',') : [];\n      \n    if (!apiKey || !validApiKeys.includes(apiKey)) {\n      return res.status(401).json({\n        success: false,\n        error: '无效的API密钥',\n        code: 'INVALID_API_KEY'\n      });\n    }\n  }\n  \n  next();\n};\n\n// 导出安全中间件\nmodule.exports = {\n  // 速率限制\n  rateLimits: securityLimits,\n  \n  // 基础安全中间件\n  securityHeaders,\n  mongoSanitize: mongoSanitize(),\n  xssClean: xss(),\n  hpp: hpp(),\n  \n  // 自定义安全中间件\n  checkIPWhitelist,\n  requestSizeLimit,\n  detectMaliciousRequests,\n  csrfProtection,\n  apiKeyAuth,\n  \n  // 工具函数\n  generateCSRFToken,\n  \n  // 完整的安全中间件栈\n  applySecurityMiddleware: (app) => {\n    // 信任代理（用于正确获取客户端IP）\n    app.set('trust proxy', 1);\n    \n    // 基础安全头部\n    app.use(securityHeaders);\n    \n    // 数据清理和验证\n    app.use(mongoSanitize());\n    app.use(xss());\n    app.use(hpp());\n    \n    // IP白名单检查\n    app.use(checkIPWhitelist);\n    \n    // 恶意请求检测\n    app.use(detectMaliciousRequests);\n    \n    // API密钥验证\n    app.use(apiKeyAuth);\n    \n    // 通用速率限制\n    app.use('/api', securityLimits.general);\n    \n    console.log('✅ 安全中间件已应用');\n  }\n};"