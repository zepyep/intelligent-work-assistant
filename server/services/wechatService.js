const User = require('../models/User');

/**
 * 微信服务类
 */
class WechatService {
  constructor() {
    try {
      const WechatAPI = require('wechat-api');
      this.api = new WechatAPI(
        process.env.WECHAT_APPID,
        process.env.WECHAT_APPSECRET
      );
    } catch (error) {
      console.log('微信API未配置，使用模拟模式');
      this.api = null;
    }
  }

  /**
   * 创建自定义菜单
   */
  async createCustomMenu() {
    const menu = {
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
              "name": "待办查询",
              "key": "TODO_QUERY"
            },
            {
              "type": "click",
              "name": "进度跟踪", 
              "key": "PROGRESS_TRACK"
            }
          ]
        },
        {
          "name": "📄 资料中心",
          "sub_button": [
            {
              "type": "click",
              "name": "文档分析",
              "key": "DOCUMENT_ANALYSIS" 
            },
            {
              "type": "click",
              "name": "资料搜索",
              "key": "DOCUMENT_SEARCH"
            },
            {
              "type": "view",
              "name": "上传文件",
              "url": `${process.env.CLIENT_URL}/upload`
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

    try {
      const result = await this.api.createMenu(menu);
      console.log('微信自定义菜单创建成功:', result);
      return result;
    } catch (error) {
      console.error('创建微信自定义菜单失败:', error);
      throw error;
    }
  }

  /**
   * 发送文本消息
   * @param {string} openId 用户openId
   * @param {string} content 消息内容
   */
  async sendTextMessage(openId, content) {
    try {
      return await this.api.sendText(openId, content);
    } catch (error) {
      console.error('发送文本消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送图文消息
   * @param {string} openId 用户openId 
   * @param {Array} articles 图文数组
   */
  async sendNewsMessage(openId, articles) {
    try {
      return await this.api.sendNews(openId, articles);
    } catch (error) {
      console.error('发送图文消息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户基本信息
   * @param {string} openId 用户openId
   */
  async getUserInfo(openId) {
    try {
      return await this.api.getUser(openId);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 批量推送消息
   * @param {Array} userIds 用户ID数组
   * @param {string} message 消息内容
   */
  async broadcastMessage(userIds, message) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (user && user.wechatBinding && user.wechatBinding.openid) {
          const result = await this.sendTextMessage(
            user.wechatBinding.openid, 
            message
          );
          results.push({ userId, success: true, result });
        }
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 发送任务提醒
   * @param {string} openId 用户openId
   * @param {Object} task 任务对象
   */
  async sendTaskReminder(openId, task) {
    const message = `📋 任务提醒\n\n任务：${task.title}\n截止时间：${task.deadline}\n优先级：${task.priority}\n\n请及时完成！`;
    
    return await this.sendTextMessage(openId, message);
  }

  /**
   * 发送会议提醒
   * @param {string} openId 用户openId
   * @param {Object} meeting 会议对象
   */
  async sendMeetingReminder(openId, meeting) {
    const message = `📅 会议提醒\n\n会议：${meeting.title}\n时间：${meeting.startTime}\n地点：${meeting.location}\n\n会议即将开始，请准时参加！`;
    
    return await this.sendTextMessage(openId, message);
  }

  /**
   * 发送智能回复
   * @param {string} openId 用户openId
   * @param {string} userMessage 用户消息
   * @param {Object} userContext 用户上下文
   */
  async sendIntelligentReply(openId, userMessage, userContext) {
    const aiService = require('./aiService');
    
    try {
      const reply = await aiService.processIntelligentMessage(userMessage, userContext);
      return await this.sendTextMessage(openId, reply);
    } catch (error) {
      console.error('发送智能回复失败:', error);
      return await this.sendTextMessage(openId, '抱歉，我暂时无法理解您的问题，请稍后再试。');
    }
  }

  /**
   * 处理语音消息
   * @param {string} openId 用户openId
   * @param {string} mediaId 媒体ID
   */
  async processVoiceMessage(openId, mediaId) {
    try {
      // 下载语音文件
      const media = await this.api.getMedia(mediaId);
      
      // TODO: 集成语音转文字服务
      const transcription = '语音转文字功能正在开发中...';
      
      // 发送处理结果
      const reply = `🎤 语音消息已收到\n\n转录内容：${transcription}\n\n如需进一步处理，请发送文字指令。`;
      
      return await this.sendTextMessage(openId, reply);
    } catch (error) {
      console.error('处理语音消息失败:', error);
      return await this.sendTextMessage(openId, '语音处理失败，请稍后再试。');
    }
  }

  /**
   * 验证微信服务器签名
   * @param {string} signature 签名
   * @param {string} timestamp 时间戳  
   * @param {string} nonce 随机数
   */
  checkSignature(signature, timestamp, nonce) {
    const crypto = require('crypto');
    const token = process.env.WECHAT_TOKEN;
    
    const tmp = [token, timestamp, nonce].sort().join('');
    const shasum = crypto.createHash('sha1');
    shasum.update(tmp);
    
    return shasum.digest('hex') === signature;
  }

  /**
   * 获取access_token
   */
  async getAccessToken() {
    try {
      const token = await this.api.ensureAccessToken();
      return token.accessToken;
    } catch (error) {
      console.error('获取access_token失败:', error);
      throw error;
    }
  }

  /**
   * 上传多媒体文件
   * @param {string} type 媒体文件类型（image/voice/video/thumb）
   * @param {string} filepath 文件路径
   */
  async uploadMedia(type, filepath) {
    try {
      return await this.api.uploadMedia(filepath, type);
    } catch (error) {
      console.error('上传媒体文件失败:', error);
      throw error;
    }
  }

  /**
   * 发送通知消息
   * @param {string} openId 用户openId
   * @param {Object} notification 通知对象
   */
  async sendNotification(openId, notification) {
    try {
      if (!this.api) {
        console.log('微信API未配置，模拟发送通知:', notification.title);
        return { success: true, message: 'Mock WeChat notification sent' };
      }

      let message = `📢 ${notification.title}\n\n${notification.content}`;
      
      // 根据通知类型添加emoji
      const typeEmoji = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        success: '✅'
      };
      
      message = `${typeEmoji[notification.type] || 'ℹ️'} ${notification.title}\n\n${notification.content}`;
      
      // 添加时间信息
      message += `\n\n🕐 发送时间: ${new Date().toLocaleString()}`;
      
      const result = await this.sendTextMessage(openId, message);
      return { success: true, result };
    } catch (error) {
      console.error('发送微信通知失败:', error);
      throw error;
    }
  }

  /**
   * 批量发送通知
   * @param {Array} openIds 用户openId数组
   * @param {Object} notification 通知对象
   */
  async broadcastNotification(openIds, notification) {
    const results = [];
    
    for (const openId of openIds) {
      try {
        const result = await this.sendNotification(openId, notification);
        results.push({ openId, success: true, result });
      } catch (error) {
        results.push({ openId, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = WechatService;