const asyncHandler = require('../utils/asyncHandler');

// 微信API初始化（占位，等待配置）
let wechatApi = null;

try {
  const WechatAPI = require('wechat-api');
  wechatApi = new WechatAPI(
    process.env.WECHAT_APPID,
    process.env.WECHAT_APPSECRET
  );
} catch (error) {
  console.log('⚠️  微信API未配置，菜单服务将在模拟模式下运行');
}

/**
 * 微信公众号菜单配置
 */
const menuConfig = {
  "button": [
    {
      "name": "📋 任务助手",
      "sub_button": [
        {
          "type": "click",
          "name": "任务规划",
          "key": "TASK_PLANNING"
        },
        {
          "type": "click",
          "name": "查看待办",
          "key": "VIEW_TASKS"
        },
        {
          "type": "click",
          "name": "进度跟踪",
          "key": "TASK_PROGRESS"
        }
      ]
    },
    {
      "name": "📄 资料中心",
      "sub_button": [
        {
          "type": "click",
          "name": "文档分析",
          "key": "DOC_ANALYSIS"
        },
        {
          "type": "click",
          "name": "资料搜索",
          "key": "SEARCH_DOCS"
        },
        {
          "type": "click",
          "name": "上传文件",
          "key": "UPLOAD_FILE"
        }
      ]
    },
    {
      "name": "📅 日程管理",
      "sub_button": [
        {
          "type": "click",
          "name": "今日日程",
          "key": "TODAY_SCHEDULE"
        },
        {
          "type": "click",
          "name": "添加事件",
          "key": "ADD_EVENT"
        },
        {
          "type": "click",
          "name": "账号绑定",
          "key": "BIND_ACCOUNT"
        }
      ]
    }
  ]
};

/**
 * 自动创建微信菜单
 */
const initializeWechatMenu = async () => {
  if (!wechatApi) {
    console.log('🔧 微信API未配置，跳过菜单初始化');
    return { success: false, message: '微信API未配置' };
  }

  try {
    // 检查是否需要更新菜单
    console.log('📱 正在初始化微信公众号菜单...');

    const result = await new Promise((resolve, reject) => {
      wechatApi.createMenu(menuConfig, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    console.log('✅ 微信公众号菜单初始化成功');
    console.log('🎯 菜单功能包括：');
    console.log('   📋 任务助手 - 任务规划、查看待办、进度跟踪');
    console.log('   📄 资料中心 - 文档分析、资料搜索、上传文件');  
    console.log('   📅 日程管理 - 今日日程、添加事件、账号绑定');

    return { 
      success: true, 
      message: '微信菜单初始化成功',
      data: { menuConfig, wechatResult: result }
    };
  } catch (error) {
    console.error('❌ 微信菜单初始化失败:', error.message);
    
    // 如果是token错误，给出更详细的提示
    if (error.message.includes('access_token')) {
      console.log('💡 提示: 请检查WECHAT_APPID和WECHAT_APPSECRET环境变量是否正确配置');
    }
    
    return { 
      success: false, 
      message: '微信菜单初始化失败', 
      error: error.message 
    };
  }
};

/**
 * 获取菜单配置
 */
const getMenuConfig = () => {
  return menuConfig;
};

/**
 * 删除微信菜单
 */
const removeWechatMenu = async () => {
  if (!wechatApi) {
    return { success: false, message: '微信API未配置' };
  }

  try {
    const result = await new Promise((resolve, reject) => {
      wechatApi.removeMenu((err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    console.log('🗑️  微信菜单已删除');
    return { success: true, message: '微信菜单删除成功', data: result };
  } catch (error) {
    console.error('❌ 删除微信菜单失败:', error);
    return { success: false, message: '删除微信菜单失败', error: error.message };
  }
};

module.exports = {
  initializeWechatMenu,
  getMenuConfig,
  removeWechatMenu,
  menuConfig
};