/**
 * 安全监控中间件
 * 实时监控和检测安全威胁
 */

const { EventEmitter } = require('events');
const securityConfig = require('../config/security');

class SecurityMonitor extends EventEmitter {
  constructor() {
    super();
    this.attacks = new Map(); // IP -> attack count
    this.suspiciousActivity = new Map(); // IP -> activity log
    this.blockedIPs = new Set();
    this.alertThreshold = securityConfig.monitoring.anomalyDetection.maxFailedAttempts || 10;
    
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // 定期清理旧记录
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  // 检测 SQL 注入尝试
  detectSQLInjection(req) {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\b(UNION|SELECT).*FROM)/gi,
      /(\b(DROP|DELETE|TRUNCATE).*TABLE)/gi
    ];

    const checkContent = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    
    for (const pattern of patterns) {
      if (pattern.test(checkContent)) {
        return true;
      }
    }
    return false;
  }

  // 检测 XSS 尝试
  detectXSS(req) {
    const patterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript\s*:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    const checkContent = JSON.stringify(req.body) + req.url + JSON.stringify(req.query);
    
    for (const pattern of patterns) {
      if (pattern.test(checkContent)) {
        return true;
      }
    }
    return false;
  }

  // 检测路径遍历攻击
  detectPathTraversal(req) {
    const patterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\./g
    ];

    const checkContent = req.url + JSON.stringify(req.params);
    
    for (const pattern of patterns) {
      if (pattern.test(checkContent)) {
        return true;
      }
    }
    return false;
  }

  // 检测暴力破解
  detectBruteForce(ip, endpoint) {
    const key = `${ip}-${endpoint}`;
    const now = Date.now();
    
    if (!this.attacks.has(key)) {
      this.attacks.set(key, []);
    }
    
    const attacks = this.attacks.get(key);
    
    // 清理 15 分钟前的记录
    const fifteenMinutesAgo = now - 15 * 60 * 1000;
    const recentAttacks = attacks.filter(time => time > fifteenMinutesAgo);
    
    recentAttacks.push(now);
    this.attacks.set(key, recentAttacks);
    
    // 如果 15 分钟内超过阈值，认为是暴力破解
    return recentAttacks.length > this.alertThreshold;
  }

  // 检测异常请求模式
  detectAnomalousPatterns(req) {
    const ip = req.ip;
    const userAgent = req.get('user-agent') || '';
    const method = req.method;
    const url = req.url;
    
    // 检查可疑的 User-Agent
    const suspiciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'w3af',
      'dirbuster',
      'gobuster',
      'burp',
      'owasp'
    ];
    
    if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      return 'suspicious_user_agent';
    }
    
    // 检查异常的请求方法组合
    if (!this.suspiciousActivity.has(ip)) {
      this.suspiciousActivity.set(ip, {
        methods: new Set(),
        endpoints: new Set(),
        requests: 0,
        startTime: Date.now()
      });
    }
    
    const activity = this.suspiciousActivity.get(ip);
    activity.methods.add(method);
    activity.endpoints.add(url);
    activity.requests++;
    
    // 短时间内大量不同端点请求（可能是扫描行为）
    if (activity.endpoints.size > 50 && activity.requests > 100) {
      return 'endpoint_scanning';
    }
    
    // 异常的请求频率
    const timeSpan = Date.now() - activity.startTime;
    if (timeSpan < 60000 && activity.requests > 100) { // 1分钟内超过100次请求
      return 'high_frequency_requests';
    }
    
    return null;
  }

  // 记录安全事件
  logSecurityEvent(type, req, details = {}) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      headers: req.headers,
      body: this.sanitizeBody(req.body),
      details
    };
    
    console.warn(`🚨 安全告警 [${type}]:`, {
      ip: event.ip,
      url: event.url,
      details: event.details
    });
    
    this.emit('security_event', event);
    
    // 如果启用了告警，发送通知
    if (securityConfig.monitoring.alerting.enabled) {
      this.sendSecurityAlert(event);
    }
    
    return event;
  }

  // 清理敏感信息
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sensitiveFields = securityConfig.logging.sensitiveFields;
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // 发送安全告警
  async sendSecurityAlert(event) {
    try {
      const webhook = securityConfig.monitoring.alerting.webhookUrl;
      const email = securityConfig.monitoring.alerting.emailAlerts;
      
      if (webhook) {
        // 发送 Webhook 告警
        await this.sendWebhookAlert(webhook, event);
      }
      
      if (email) {
        // 发送邮件告警
        await this.sendEmailAlert(email, event);
      }
    } catch (error) {
      console.error('发送安全告警失败:', error);
    }
  }

  async sendWebhookAlert(webhookUrl, event) {
    const axios = require('axios');
    
    const payload = {
      text: `🚨 安全告警: ${event.type}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'IP地址', value: event.ip, short: true },
          { title: '时间', value: event.timestamp, short: true },
          { title: '请求URL', value: event.url, short: false },
          { title: '详情', value: JSON.stringify(event.details), short: false }
        ]
      }]
    };
    
    await axios.post(webhookUrl, payload);
  }

  async sendEmailAlert(email, event) {
    // 这里可以集成邮件服务
    console.log(`📧 邮件告警发送至: ${email}`, event);
  }

  // 阻止 IP
  blockIP(ip, duration = 24 * 60 * 60 * 1000) {
    this.blockedIPs.add(ip);
    
    console.log(`🚫 IP ${ip} 已被阻止 ${duration / 1000 / 60} 分钟`);
    
    // 设置自动解封
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log(`✅ IP ${ip} 已解封`);
    }, duration);
  }

  // 检查 IP 是否被阻止
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  // 清理旧记录
  cleanupOldRecords() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // 清理攻击记录
    for (const [key, attacks] of this.attacks.entries()) {
      const recentAttacks = attacks.filter(time => time > oneHourAgo);
      if (recentAttacks.length === 0) {
        this.attacks.delete(key);
      } else {
        this.attacks.set(key, recentAttacks);
      }
    }
    
    // 清理可疑活动记录
    for (const [ip, activity] of this.suspiciousActivity.entries()) {
      if (activity.startTime < oneHourAgo) {
        this.suspiciousActivity.delete(ip);
      }
    }
  }

  // 获取安全统计
  getSecurityStats() {
    return {
      totalAttacks: Array.from(this.attacks.values()).reduce((sum, attacks) => sum + attacks.length, 0),
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousActivity.size,
      topAttackers: this.getTopAttackers()
    };
  }

  getTopAttackers(limit = 10) {
    const attackCounts = new Map();
    
    for (const [key, attacks] of this.attacks.entries()) {
      const ip = key.split('-')[0];
      attackCounts.set(ip, (attackCounts.get(ip) || 0) + attacks.length);
    }
    
    return Array.from(attackCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([ip, count]) => ({ ip, attacks: count }));
  }
}

// 创建全局监控实例
const securityMonitor = new SecurityMonitor();

// 中间件函数
function createSecurityMonitorMiddleware() {
  return (req, res, next) => {
    const ip = req.ip;
    
    // 检查 IP 是否被阻止
    if (securityMonitor.isBlocked(ip)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'IP_BLOCKED'
      });
    }
    
    let blocked = false;
    
    // 检测 SQL 注入
    if (securityMonitor.detectSQLInjection(req)) {
      securityMonitor.logSecurityEvent('sql_injection', req);
      securityMonitor.blockIP(ip, 60 * 60 * 1000); // 阻止1小时
      blocked = true;
    }
    
    // 检测 XSS
    if (!blocked && securityMonitor.detectXSS(req)) {
      securityMonitor.logSecurityEvent('xss_attempt', req);
      securityMonitor.blockIP(ip, 60 * 60 * 1000); // 阻止1小时
      blocked = true;
    }
    
    // 检测路径遍历
    if (!blocked && securityMonitor.detectPathTraversal(req)) {
      securityMonitor.logSecurityEvent('path_traversal', req);
      securityMonitor.blockIP(ip, 60 * 60 * 1000); // 阻止1小时
      blocked = true;
    }
    
    // 检测暴力破解（针对认证端点）
    if (!blocked && (req.url.includes('/api/auth/') || req.url.includes('/login'))) {
      if (securityMonitor.detectBruteForce(ip, req.url)) {
        securityMonitor.logSecurityEvent('brute_force', req, { endpoint: req.url });
        securityMonitor.blockIP(ip, 24 * 60 * 60 * 1000); // 阻止24小时
        blocked = true;
      }
    }
    
    // 检测异常模式
    if (!blocked) {
      const anomalyType = securityMonitor.detectAnomalousPatterns(req);
      if (anomalyType) {
        securityMonitor.logSecurityEvent(anomalyType, req);
        if (['endpoint_scanning', 'high_frequency_requests'].includes(anomalyType)) {
          securityMonitor.blockIP(ip, 60 * 60 * 1000); // 阻止1小时
          blocked = true;
        }
      }
    }
    
    if (blocked) {
      return res.status(403).json({
        success: false,
        error: 'Security violation detected',
        code: 'SECURITY_VIOLATION'
      });
    }
    
    next();
  };
}

// 安全统计端点中间件
function createSecurityStatsMiddleware() {
  return (req, res, next) => {
    // 只允许管理员访问
    if (req.user && req.user.role === 'admin') {
      req.securityStats = securityMonitor.getSecurityStats();
    }
    next();
  };
}

module.exports = {
  SecurityMonitor,
  securityMonitor,
  createSecurityMonitorMiddleware,
  createSecurityStatsMiddleware
};