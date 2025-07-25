const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const wechatService = require('../services/wechatService');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// 所有管理接口都需要管理员权限
router.use(protect);
router.use(authorize('admin', 'super_admin'));

/**
 * 创建微信自定义菜单
 * @route   POST /api/wechat-admin/create-menu
 * @access  Private (Admin)
 */
const createCustomMenu = asyncHandler(async (req, res) => {
  try {
    const result = await wechatService.createCustomMenu();
    
    res.status(200).json({
      success: true,
      message: '微信自定义菜单创建成功',
      data: result
    });
  } catch (error) {
    console.error('创建微信菜单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建微信菜单失败: ' + error.message
    });
  }
});

/**
 * 获取微信Access Token
 * @route   GET /api/wechat-admin/access-token
 * @access  Private (Admin)
 */
const getAccessToken = asyncHandler(async (req, res) => {
  try {
    const accessToken = await wechatService.getAccessToken();
    
    res.status(200).json({
      success: true,
      message: '获取Access Token成功',
      data: {
        accessToken,
        expiresIn: 7200 // 2小时
      }
    });
  } catch (error) {
    console.error('获取Access Token失败:', error);
    res.status(500).json({
      success: false,
      message: '获取Access Token失败: ' + error.message
    });
  }
});

/**
 * 批量发送消息
 * @route   POST /api/wechat-admin/broadcast
 * @access  Private (Admin)
 */
const broadcastMessage = asyncHandler(async (req, res) => {
  const { userIds, message, messageType = 'text' } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的用户ID数组'
    });
  }

  if (!message) {
    return res.status(400).json({
      success: false,
      message: '请提供消息内容'
    });
  }

  try {
    const results = await wechatService.broadcastMessage(userIds, message);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `消息推送完成，成功: ${successCount}, 失败: ${failCount}`,
      data: {
        total: results.length,
        successful: successCount,
        failed: failCount,
        results: results
      }
    });
  } catch (error) {
    console.error('批量发送消息失败:', error);
    res.status(500).json({
      success: false,
      message: '批量发送消息失败: ' + error.message
    });
  }
});

/**
 * 获取微信配置状态
 * @route   GET /api/wechat-admin/config-status
 * @access  Private (Admin)
 */
const getConfigStatus = asyncHandler(async (req, res) => {
  const requiredEnvVars = [
    'WECHAT_APPID',
    'WECHAT_APPSECRET', 
    'WECHAT_TOKEN'
  ];

  const configStatus = {};
  let isFullyConfigured = true;

  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    configStatus[envVar] = {
      configured: !!(value && !value.startsWith('your-')),
      hasValue: !!value,
      isPlaceholder: !!(value && value.startsWith('your-'))
    };

    if (!configStatus[envVar].configured) {
      isFullyConfigured = false;
    }
  });

  // 检查微信服务是否可用
  let wechatServiceAvailable = false;
  try {
    if (wechatService.api) {
      await wechatService.getAccessToken();
      wechatServiceAvailable = true;
    }
  } catch (error) {
    console.log('微信服务不可用:', error.message);
  }

  res.status(200).json({
    success: true,
    data: {
      isFullyConfigured,
      wechatServiceAvailable,
      configDetails: configStatus,
      recommendations: getConfigRecommendations(configStatus)
    }
  });
});

/**
 * 测试微信webhook
 * @route   POST /api/wechat-admin/test-webhook
 * @access  Private (Admin)
 */
const testWebhook = asyncHandler(async (req, res) => {
  const { signature, timestamp, nonce } = req.body;

  if (!signature || !timestamp || !nonce) {
    return res.status(400).json({
      success: false,
      message: '请提供signature, timestamp, nonce参数'
    });
  }

  try {
    const isValid = wechatService.checkSignature(signature, timestamp, nonce);
    
    res.status(200).json({
      success: true,
      message: 'Webhook验证测试完成',
      data: {
        signatureValid: isValid,
        timestamp,
        nonce
      }
    });
  } catch (error) {
    console.error('Webhook测试失败:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook测试失败: ' + error.message
    });
  }
});

/**
 * 获取微信用户统计
 * @route   GET /api/wechat-admin/user-stats
 * @access  Private (Admin)
 */
const getUserStats = asyncHandler(async (req, res) => {
  const User = require('../models/User');

  try {
    const [totalUsers, boundUsers, unboundUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'wechatBinding.openid': { $exists: true, $ne: null } }),
      User.countDocuments({ 
        $or: [
          { 'wechatBinding.openid': { $exists: false } },
          { 'wechatBinding.openid': null }
        ]
      })
    ]);

    const bindingRate = totalUsers > 0 ? Math.round((boundUsers / totalUsers) * 100) : 0;

    // 获取最近7天的绑定趋势
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentBindings = await User.countDocuments({
      'wechatBinding.bindTime': { $gte: sevenDaysAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        boundUsers,
        unboundUsers,
        bindingRate: `${bindingRate}%`,
        recentBindings: {
          count: recentBindings,
          period: '7天'
        },
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计失败: ' + error.message
    });
  }
});

// 辅助函数：生成配置建议
function getConfigRecommendations(configStatus) {
  const recommendations = [];

  if (!configStatus.WECHAT_APPID.configured) {
    recommendations.push({
      type: 'error',
      message: '请在微信公众平台获取AppID并配置到环境变量WECHAT_APPID'
    });
  }

  if (!configStatus.WECHAT_APPSECRET.configured) {
    recommendations.push({
      type: 'error',
      message: '请在微信公众平台获取AppSecret并配置到环境变量WECHAT_APPSECRET'
    });
  }

  if (!configStatus.WECHAT_TOKEN.configured) {
    recommendations.push({
      type: 'error',
      message: '请设置自定义Token并配置到环境变量WECHAT_TOKEN'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: '微信配置完整，可以正常使用微信公众号功能'
    });
  }

  return recommendations;
}

// 路由定义
router.post('/create-menu', createCustomMenu);
router.get('/access-token', getAccessToken);
router.post('/broadcast', broadcastMessage);
router.get('/config-status', getConfigStatus);
router.post('/test-webhook', testWebhook);
router.get('/user-stats', getUserStats);

module.exports = router;