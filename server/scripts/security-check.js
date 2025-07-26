#!/usr/bin/env node

/**
 * 生产环境安全检查脚本
 * 验证所有安全配置是否正确设置
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SecurityChecker {
  constructor() {
    this.warnings = [];
    this.errors = [];
    this.passed = [];
  }

  logResult(test, status, message) {
    const result = { test, status, message };
    
    switch (status) {
      case 'PASS':
        this.passed.push(result);
        console.log(`✅ ${test}: ${message}`);
        break;
      case 'WARN':
        this.warnings.push(result);
        console.log(`⚠️  ${test}: ${message}`);
        break;
      case 'FAIL':
        this.errors.push(result);
        console.log(`❌ ${test}: ${message}`);
        break;
    }
  }

  checkEnvironmentVariables() {
    console.log('\n🔍 检查环境变量配置...\n');

    // 必需的环境变量
    const requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'MONGODB_URI',
      'OPENAI_API_KEY'
    ];

    // 推荐的安全环境变量
    const recommendedVars = [
      'ENCRYPTION_SECRET',
      'SESSION_SECRET',
      'USER_DATA_KEY',
      'WECHAT_ENCRYPTION_KEY',
      'API_TOKEN_KEY'
    ];

    // 生产环境必需变量
    const productionVars = [
      'CLIENT_URL',
      'ALLOWED_IPS',
      'ADMIN_API_KEYS',
      'SYSTEM_API_KEYS',
      'SECURITY_ALERT_WEBHOOK'
    ];

    // 检查必需变量
    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        this.logResult('环境变量', 'PASS', `${varName} 已设置`);
      } else {
        this.logResult('环境变量', 'FAIL', `${varName} 未设置`);
      }
    });

    // 检查推荐变量
    recommendedVars.forEach(varName => {
      if (process.env[varName]) {
        this.logResult('环境变量', 'PASS', `${varName} 已设置`);
      } else {
        this.logResult('环境变量', 'WARN', `${varName} 未设置，建议配置`);
      }
    });

    // 生产环境特殊检查
    if (process.env.NODE_ENV === 'production') {
      productionVars.forEach(varName => {
        if (process.env[varName]) {
          this.logResult('生产环境', 'PASS', `${varName} 已设置`);
        } else {
          this.logResult('生产环境', 'WARN', `${varName} 建议在生产环境设置`);
        }
      });
    }
  }

  checkPasswordSecurity() {
    console.log('\n🔐 检查密码安全策略...\n');

    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
    const requireNumbers = process.env.PASSWORD_REQUIRE_NUMBERS === 'true';
    const requireUppercase = process.env.PASSWORD_REQUIRE_UPPERCASE === 'true';
    const requireSymbols = process.env.PASSWORD_REQUIRE_SYMBOLS === 'true';

    if (minLength >= 8) {
      this.logResult('密码策略', 'PASS', `最小长度 ${minLength} 符合要求`);
    } else {
      this.logResult('密码策略', 'WARN', `最小长度 ${minLength} 建议至少8位`);
    }

    if (requireNumbers || requireUppercase || requireSymbols) {
      this.logResult('密码策略', 'PASS', '已启用密码复杂度要求');
    } else {
      this.logResult('密码策略', 'WARN', '建议启用密码复杂度要求');
    }
  }

  checkSSLConfiguration() {
    console.log('\n🔒 检查SSL/HTTPS配置...\n');

    const httpsEnabled = process.env.HTTPS_ENABLED === 'true';
    const forceHttps = process.env.FORCE_HTTPS === 'true';

    if (process.env.NODE_ENV === 'production') {
      if (httpsEnabled) {
        this.logResult('HTTPS', 'PASS', '生产环境已启用HTTPS');
      } else {
        this.logResult('HTTPS', 'FAIL', '生产环境必须启用HTTPS');
      }

      if (forceHttps) {
        this.logResult('HTTPS', 'PASS', '已启用强制HTTPS重定向');
      } else {
        this.logResult('HTTPS', 'WARN', '建议启用强制HTTPS重定向');
      }
    } else {
      this.logResult('HTTPS', 'PASS', '开发环境HTTPS配置可选');
    }
  }

  checkRateLimiting() {
    console.log('\n⏱️  检查速率限制配置...\n');

    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15分钟
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    if (windowMs <= 900000) { // 15分钟或更短
      this.logResult('速率限制', 'PASS', `时间窗口 ${windowMs/1000/60}分钟 合理`);
    } else {
      this.logResult('速率限制', 'WARN', `时间窗口 ${windowMs/1000/60}分钟 可能过长`);
    }

    if (maxRequests <= 200) {
      this.logResult('速率限制', 'PASS', `最大请求数 ${maxRequests} 合理`);
    } else {
      this.logResult('速率限制', 'WARN', `最大请求数 ${maxRequests} 可能过高`);
    }
  }

  checkDatabaseSecurity() {
    console.log('\n🗄️  检查数据库安全配置...\n');

    const mongoUri = process.env.MONGODB_URI;
    
    if (mongoUri) {
      if (mongoUri.includes('ssl=true') || mongoUri.includes('authSource')) {
        this.logResult('数据库', 'PASS', '数据库连接包含安全参数');
      } else {
        this.logResult('数据库', 'WARN', '建议在数据库连接中启用SSL和认证');
      }

      if (mongoUri.includes('localhost') && process.env.NODE_ENV === 'production') {
        this.logResult('数据库', 'WARN', '生产环境不建议使用localhost数据库');
      } else {
        this.logResult('数据库', 'PASS', '数据库连接配置合理');
      }
    } else {
      this.logResult('数据库', 'FAIL', 'MONGODB_URI 未配置');
    }

    const dbSsl = process.env.DB_SSL === 'true';
    if (process.env.NODE_ENV === 'production' && !dbSsl) {
      this.logResult('数据库', 'WARN', '生产环境建议启用数据库SSL');
    }
  }

  checkAPIKeySecurity() {
    console.log('\n🔑 检查API密钥安全...\n');

    const openaiKey = process.env.OPENAI_API_KEY;
    const wechatKey = process.env.WECHAT_WEBHOOK_KEY;
    const adminKeys = process.env.ADMIN_API_KEYS;

    if (openaiKey && openaiKey.length > 20) {
      this.logResult('API密钥', 'PASS', 'OpenAI API密钥已配置');
    } else {
      this.logResult('API密钥', 'FAIL', 'OpenAI API密钥未正确配置');
    }

    if (wechatKey) {
      this.logResult('API密钥', 'PASS', '微信Webhook密钥已配置');
    } else {
      this.logResult('API密钥', 'WARN', '微信Webhook密钥未配置');
    }

    if (adminKeys) {
      const keys = adminKeys.split(',');
      if (keys.length > 0 && keys[0].length > 32) {
        this.logResult('API密钥', 'PASS', '管理员API密钥已配置');
      } else {
        this.logResult('API密钥', 'WARN', '管理员API密钥长度不足');
      }
    } else {
      this.logResult('API密钥', 'WARN', '管理员API密钥未配置');
    }
  }

  checkFileUploadSecurity() {
    console.log('\n📁 检查文件上传安全配置...\n');

    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 20971520; // 20MB
    const enableVirusScan = process.env.ENABLE_VIRUS_SCAN === 'true';

    if (maxFileSize <= 52428800) { // 50MB
      this.logResult('文件上传', 'PASS', `最大文件大小 ${Math.round(maxFileSize/1024/1024)}MB 合理`);
    } else {
      this.logResult('文件上传', 'WARN', `最大文件大小 ${Math.round(maxFileSize/1024/1024)}MB 可能过大`);
    }

    if (enableVirusScan) {
      this.logResult('文件上传', 'PASS', '已启用病毒扫描');
    } else {
      this.logResult('文件上传', 'WARN', '建议启用病毒扫描');
    }

    // 检查uploads目录权限
    const uploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      try {
        const stats = fs.statSync(uploadsDir);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        if (mode === '755' || mode === '750') {
          this.logResult('文件上传', 'PASS', `uploads目录权限 ${mode} 安全`);
        } else {
          this.logResult('文件上传', 'WARN', `uploads目录权限 ${mode} 建议设置为755或750`);
        }
      } catch (error) {
        this.logResult('文件上传', 'WARN', 'uploads目录权限检查失败');
      }
    }
  }

  checkLoggingSecurity() {
    console.log('\n📝 检查日志安全配置...\n');

    const filterSensitive = process.env.FILTER_SENSITIVE_DATA !== 'false';
    const encryptLogs = process.env.ENCRYPT_LOGS === 'true';
    const enableAuditLog = process.env.ENABLE_AUDIT_LOG === 'true';

    if (filterSensitive) {
      this.logResult('日志安全', 'PASS', '已启用敏感数据过滤');
    } else {
      this.logResult('日志安全', 'WARN', '建议启用敏感数据过滤');
    }

    if (encryptLogs) {
      this.logResult('日志安全', 'PASS', '已启用日志加密');
    } else {
      this.logResult('日志安全', 'WARN', '建议启用日志加密');
    }

    if (enableAuditLog) {
      this.logResult('日志安全', 'PASS', '已启用审计日志');
    } else {
      this.logResult('日志安全', 'WARN', '建议启用审计日志');
    }
  }

  checkMonitoringSecurity() {
    console.log('\n📊 检查安全监控配置...\n');

    const anomalyDetection = process.env.ENABLE_ANOMALY_DETECTION === 'true';
    const intrusionDetection = process.env.ENABLE_INTRUSION_DETECTION === 'true';
    const securityAlerts = process.env.ENABLE_SECURITY_ALERTS === 'true';
    const alertWebhook = process.env.SECURITY_ALERT_WEBHOOK;

    if (anomalyDetection) {
      this.logResult('安全监控', 'PASS', '已启用异常检测');
    } else {
      this.logResult('安全监控', 'WARN', '建议启用异常检测');
    }

    if (intrusionDetection) {
      this.logResult('安全监控', 'PASS', '已启用入侵检测');
    } else {
      this.logResult('安全监控', 'WARN', '建议启用入侵检测');
    }

    if (securityAlerts && alertWebhook) {
      this.logResult('安全监控', 'PASS', '已配置安全告警');
    } else {
      this.logResult('安全监控', 'WARN', '建议配置安全告警');
    }
  }

  checkProductionReadiness() {
    console.log('\n🚀 检查生产环境就绪状态...\n');

    if (process.env.NODE_ENV !== 'production') {
      this.logResult('生产就绪', 'WARN', '当前非生产环境');
      return;
    }

    const criticalChecks = [
      process.env.JWT_SECRET && process.env.JWT_SECRET.length > 32,
      process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET.length > 32,
      process.env.HTTPS_ENABLED === 'true',
      process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('localhost'),
      process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')
    ];

    const passedChecks = criticalChecks.filter(Boolean).length;
    const totalChecks = criticalChecks.length;

    if (passedChecks === totalChecks) {
      this.logResult('生产就绪', 'PASS', `所有关键检查已通过 (${passedChecks}/${totalChecks})`);
    } else {
      this.logResult('生产就绪', 'FAIL', `关键检查未全部通过 (${passedChecks}/${totalChecks})`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 安全检查报告');
    console.log('='.repeat(60));

    console.log(`\n✅ 通过: ${this.passed.length}`);
    console.log(`⚠️  警告: ${this.warnings.length}`);
    console.log(`❌ 错误: ${this.errors.length}`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告详情:');
      this.warnings.forEach(w => {
        console.log(`   - ${w.test}: ${w.message}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      this.errors.forEach(e => {
        console.log(`   - ${e.test}: ${e.message}`);
      });
    }

    // 总体评估
    const totalChecks = this.passed.length + this.warnings.length + this.errors.length;
    const score = Math.round((this.passed.length / totalChecks) * 100);

    console.log(`\n📊 安全评分: ${score}/100`);

    if (this.errors.length === 0) {
      if (this.warnings.length === 0) {
        console.log('\n🎉 恭喜！所有安全检查都已通过！');
      } else {
        console.log('\n✅ 基础安全检查通过，建议处理警告项以提高安全性');
      }
    } else {
      console.log('\n❌ 存在安全风险，请立即处理错误项');
    }

    return {
      passed: this.passed.length,
      warnings: this.warnings.length,
      errors: this.errors.length,
      score
    };
  }

  run() {
    console.log('🔐 智能工作助手安全检查工具 v1.0.0');
    console.log('==================================');

    this.checkEnvironmentVariables();
    this.checkPasswordSecurity();
    this.checkSSLConfiguration();
    this.checkRateLimiting();
    this.checkDatabaseSecurity();
    this.checkAPIKeySecurity();
    this.checkFileUploadSecurity();
    this.checkLoggingSecurity();
    this.checkMonitoringSecurity();
    this.checkProductionReadiness();

    const report = this.generateReport();

    // 退出码
    if (report.errors > 0) {
      process.exit(1);
    } else if (report.warnings > 5) {
      process.exit(2);
    } else {
      process.exit(0);
    }
  }
}

// 运行安全检查
if (require.main === module) {
  const checker = new SecurityChecker();
  checker.run();
}

module.exports = SecurityChecker;