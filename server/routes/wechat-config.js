/**
 * 微信配置管理路由
 * 用于管理微信公众号的生产环境配置
 */

const express = require('express');
const WechatProductionConfig = require('../config/wechat-production');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const wechatConfig = new WechatProductionConfig();

// 所有配置管理路由都需要管理员权限
router.use(protect);
router.use(authorize('admin', 'super_admin'));

/**
 * 获取微信配置状态
 * GET /api/wechat-config/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const configReport = wechatConfig.generateConfigReport();
  
  res.status(200).json({
    success: true,
    data: configReport
  });
}));

/**
 * 获取当前配置（敏感信息脱敏）
 * GET /api/wechat-config/current
 */
router.get('/current', asyncHandler(async (req, res) => {
  const config = wechatConfig.config;
  
  // 脱敏处理
  const maskedConfig = {
    appId: config.appId ? config.appId.substring(0, 6) + '...' : '未配置',
    appSecret: config.appSecret ? '已配置' : '未配置',
    token: config.token ? '已配置' : '未配置',
    encodingAESKey: config.encodingAESKey ? '已配置' : '未配置',
    serverUrl: config.serverUrl || '未配置',
    menuConfig: config.menuConfig ? '已配置' : '使用默认配置'
  };
  
  res.status(200).json({
    success: true,
    data: maskedConfig
  });
}));

/**
 * 更新微信配置
 * PUT /api/wechat-config/update
 */
router.put('/update', asyncHandler(async (req, res) => {
  const { appId, appSecret, token, encodingAESKey, serverUrl } = req.body;
  
  // 验证必要字段
  if (!appId || !appSecret || !token) {
    return res.status(400).json({
      success: false,
      message: 'AppID、AppSecret和Token是必填项'
    });
  }
  
  // 更新配置
  const updates = {
    appId,
    appSecret,
    token,
    encodingAESKey: encodingAESKey || '',
    serverUrl: serverUrl || `${process.env.BASE_URL}/api/wechat/webhook`
  };
  
  const success = wechatConfig.updateConfig(updates);
  
  if (success) {
    res.status(200).json({
      success: true,
      message: '微信配置更新成功',
      data: {
        appId: appId.substring(0, 6) + '...',
        configStatus: wechatConfig.getConfigStatus()
      }
    });
  } else {
    res.status(500).json({
      success: false,
      message: '微信配置更新失败'
    });
  }
}));

/**
 * 测试微信API连接
 * POST /api/wechat-config/test
 */
router.post('/test', asyncHandler(async (req, res) => {
  const testResult = await wechatConfig.testConnection();
  
  res.status(testResult.success ? 200 : 400).json({
    success: testResult.success,
    message: testResult.message,
    data: testResult
  });
}));

/**
 * 验证webhook配置
 * POST /api/wechat-config/verify-webhook
 */
router.post('/verify-webhook', asyncHandler(async (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.body;
  
  if (!signature || !timestamp || !nonce) {
    return res.status(400).json({
      success: false,
      message: '缺少必要的验证参数'
    });
  }
  
  const isValid = wechatConfig.verifySignature(signature, timestamp, nonce);
  
  if (isValid) {
    res.status(200).json({
      success: true,
      message: 'Webhook验证成功',
      data: {
        verified: true,
        echostr: echostr || 'success'
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Webhook验证失败，请检查Token配置'
    });
  }
}));

/**
 * 更新菜单配置
 * PUT /api/wechat-config/menu
 */
router.put('/menu', asyncHandler(async (req, res) => {
  const { menuConfig } = req.body;
  
  if (!menuConfig || !menuConfig.button) {
    return res.status(400).json({
      success: false,
      message: '无效的菜单配置'
    });
  }
  
  const success = wechatConfig.updateConfigField('menuConfig', menuConfig);
  
  if (success) {
    res.status(200).json({
      success: true,
      message: '菜单配置更新成功'
    });
  } else {
    res.status(500).json({
      success: false,
      message: '菜单配置更新失败'
    });
  }
}));

/**
 * 获取默认菜单配置
 * GET /api/wechat-config/menu/default
 */
router.get('/menu/default', asyncHandler(async (req, res) => {
  const defaultMenu = wechatConfig.getDefaultMenuConfig();
  
  res.status(200).json({
    success: true,
    data: defaultMenu
  });
}));

/**
 * 重置配置到默认状态
 * POST /api/wechat-config/reset
 */
router.post('/reset', asyncHandler(async (req, res) => {
  const { confirmReset } = req.body;
  
  if (confirmReset !== 'CONFIRM_RESET') {
    return res.status(400).json({
      success: false,
      message: '请提供重置确认码'
    });
  }
  
  // 创建备份
  const currentConfig = wechatConfig.config;
  const backupPath = `server/data/wechat-config-backup-${Date.now()}.json`;
  
  try {
    const fs = require('fs');
    fs.writeFileSync(backupPath, JSON.stringify(currentConfig, null, 2));
    
    // 重置配置
    const defaultConfig = {
      appId: '',
      appSecret: '',
      token: '',
      encodingAESKey: '',
      serverUrl: `${process.env.BASE_URL}/api/wechat/webhook`,
      menuConfig: wechatConfig.getDefaultMenuConfig()
    };
    
    const success = wechatConfig.updateConfig(defaultConfig);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: '配置已重置为默认状态',
        data: {
          backupPath,
          newStatus: wechatConfig.getConfigStatus()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: '配置重置失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `配置重置失败: ${error.message}`
    });
  }
}));

/**
 * 导出配置（用于备份）
 * GET /api/wechat-config/export
 */
router.get('/export', asyncHandler(async (req, res) => {
  const config = wechatConfig.config;
  
  // 创建脱敏的导出配置
  const exportConfig = {
    appId: config.appId,
    hasAppSecret: !!config.appSecret,
    hasToken: !!config.token,
    hasEncodingAESKey: !!config.encodingAESKey,
    serverUrl: config.serverUrl,
    menuConfig: config.menuConfig,
    exportTime: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };
  
  res.status(200).json({
    success: true,
    data: exportConfig
  });
}));

/**
 * 获取配置向导信息
 * GET /api/wechat-config/wizard
 */
router.get('/wizard', asyncHandler(async (req, res) => {
  const status = wechatConfig.getConfigStatus();
  const validation = wechatConfig.validateConfig();
  
  const wizardSteps = [
    {
      step: 1,
      title: '获取微信公众号凭据',
      description: '在微信公众平台获取AppID和AppSecret',
      completed: !!wechatConfig.config.appId && !!wechatConfig.config.appSecret,
      instructions: [
        '1. 登录微信公众平台 (https://mp.weixin.qq.com/)',
        '2. 进入"开发" > "基本配置"页面',
        '3. 获取AppID和AppSecret（如果没有，需要重新生成）',
        '4. 保存这些凭据，稍后配置到系统中'
      ]
    },
    {
      step: 2,
      title: '设置Token验证',
      description: '配置用于消息验证的Token',
      completed: !!wechatConfig.config.token,
      instructions: [
        '1. 生成一个随机字符串作为Token（建议20位以上）',
        '2. 记录此Token，需要在微信公众平台和系统中保持一致'
      ]
    },
    {
      step: 3,
      title: '配置服务器地址',
      description: '在微信公众平台配置服务器URL',
      completed: !!wechatConfig.config.serverUrl,
      instructions: [
        '1. 确保您的服务器可以被外网访问',
        `2. 在微信公众平台配置URL: ${wechatConfig.config.serverUrl}`,
        '3. 填入之前设置的Token',
        '4. 选择消息加解密方式（建议选择安全模式）'
      ]
    },
    {
      step: 4,
      title: '测试连接',
      description: '验证配置是否正确',
      completed: validation.valid,
      instructions: [
        '1. 点击"测试连接"按钮验证配置',
        '2. 确保微信公众平台的URL验证通过',
        '3. 测试发送消息到公众号'
      ]
    },
    {
      step: 5,
      title: '创建自定义菜单',
      description: '设置公众号的自定义菜单',
      completed: !!wechatConfig.config.menuConfig,
      instructions: [
        '1. 使用默认菜单配置或自定义菜单',
        '2. 调用创建菜单API',
        '3. 在微信中验证菜单显示和功能'
      ]
    }
  ];
  
  const currentStep = wizardSteps.findIndex(step => !step.completed) + 1;
  
  res.status(200).json({
    success: true,
    data: {
      steps: wizardSteps,
      currentStep: currentStep > wizardSteps.length ? wizardSteps.length : currentStep,
      totalSteps: wizardSteps.length,
      overallProgress: Math.round((wizardSteps.filter(s => s.completed).length / wizardSteps.length) * 100)
    }
  });
}));

module.exports = router;