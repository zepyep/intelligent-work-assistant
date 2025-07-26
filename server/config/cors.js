/**
 * CORS 配置文件 - 支持 Clacky 环境
 */

const corsConfig = {
  origin: function (origin, callback) {
    // 在开发环境中允许所有来源
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // 生产环境和Clacky环境的白名单
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'http://0.0.0.0:3000',
      process.env.CLIENT_URL,
    ].filter(Boolean);
    
    // 支持Clacky环境域名
    const clackyDomainPattern = /^https?:\/\/.*\.clackypaas\.com$/;
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || clackyDomainPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'X-API-Key',
    'X-CSRF-Token',
    'X-Session-Id',
    'Host',
    'Origin',
    'Accept'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200 // 支持传统浏览器
};

module.exports = corsConfig;