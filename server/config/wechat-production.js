/**
 * 微信公众号生产环境配置管理
 * 用于管理微信公众号在生产环境下的配置和凭据
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WechatProductionConfig {
  constructor() {
    this.configPath = path.join(__dirname, '../data/wechat-credentials.json');
    this.config = this.loadConfig();
  }

  /**
   * 加载微信配置
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const encryptedData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return this.decryptConfig(encryptedData);
      }
    } catch (error) {
      console.error('加载微信配置失败:', error);
    }
    
    // 返回默认配置，从环境变量读取
    return {
      appId: process.env.WECHAT_APPID || process.env.WECHAT_APP_ID,
      appSecret: process.env.WECHAT_APPSECRET || process.env.WECHAT_APP_SECRET,
      token: process.env.WECHAT_TOKEN,
      encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
      serverUrl: process.env.WECHAT_SERVER_URL || `${process.env.BASE_URL}/api/wechat/webhook`,
      menuConfig: this.getDefaultMenuConfig()
    };
  }

  /**
   * 保存微信配置（加密存储）
   */
  saveConfig(config) {
    try {
      // 确保目录存在
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 加密并保存配置
      const encryptedData = this.encryptConfig(config);
      fs.writeFileSync(this.configPath, JSON.stringify(encryptedData, null, 2));
      
      this.config = config;
      return true;
    } catch (error) {
      console.error('保存微信配置失败:', error);
      return false;
    }
  }

  /**
   * 加密配置数据
   */
  encryptConfig(config) {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 解密配置数据
   */
  decryptConfig(encryptedData) {
    try {
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('解密配置失败:', error);
      return {};
    }
  }

  /**
   * 获取加密密钥
   */
  getEncryptionKey() {
    return process.env.WECHAT_CONFIG_KEY || process.env.JWT_SECRET || 'default-key-change-in-production';
  }

  /**
   * 验证配置完整性
   */
  validateConfig(config = this.config) {
    const required = ['appId', 'appSecret', 'token'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        missingFields: missing,
        message: `缺少必要的配置项: ${missing.join(', ')}`
      };
    }

    return {
      valid: true,
      message: '配置完整'
    };
  }

  /**
   * 获取当前配置状态
   */
  getConfigStatus() {
    const validation = this.validateConfig();
    
    return {
      configured: validation.valid,
      appId: this.config.appId ? '已配置' : '未配置',
      appSecret: this.config.appSecret ? '已配置' : '未配置',
      token: this.config.token ? '已配置' : '未配置',
      encodingAESKey: this.config.encodingAESKey ? '已配置' : '可选',
      serverUrl: this.config.serverUrl || '未配置',
      lastUpdated: this.getLastUpdated(),
      validation
    };
  }

  /**
   * 获取配置更新时间
   */
  getLastUpdated() {
    try {
      if (fs.existsSync(this.configPath)) {
        const stats = fs.statSync(this.configPath);
        return stats.mtime.toISOString();
      }
    } catch (error) {
      console.error('获取配置文件时间失败:', error);
    }
    return null;
  }

  /**
   * 更新特定配置项
   */
  updateConfigField(field, value) {
    this.config[field] = value;
    return this.saveConfig(this.config);
  }

  /**
   * 批量更新配置
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    return this.saveConfig(this.config);
  }

  /**
   * 获取默认菜单配置
   */
  getDefaultMenuConfig() {
    return {
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
              "url": `${process.env.BASE_URL || 'https://yourdomain.com'}/upload`
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
  }

  /**
   * 生成webhook验证签名
   */
  generateSignature(timestamp, nonce, token = this.config.token) {
    const tmp = [token, timestamp, nonce].sort().join('');
    return crypto.createHash('sha1').update(tmp).digest('hex');
  }

  /**
   * 验证webhook签名
   */
  verifySignature(signature, timestamp, nonce, token = this.config.token) {
    const expectedSignature = this.generateSignature(timestamp, nonce, token);
    return signature === expectedSignature;
  }

  /**
   * 获取访问令牌（Access Token）
   * 注意：在生产环境中应该实现token缓存和自动刷新机制
   */
  async getAccessToken() {
    const { appId, appSecret } = this.config;
    
    if (!appId || !appSecret) {
      throw new Error('微信AppID或AppSecret未配置');
    }

    try {
      const axios = require('axios');
      const response = await axios.get(`https://api.weixin.qq.com/cgi-bin/token`, {
        params: {
          grant_type: 'client_credential',
          appid: appId,
          secret: appSecret
        }
      });

      if (response.data.errcode) {
        throw new Error(`获取Access Token失败: ${response.data.errmsg}`);
      }

      return response.data.access_token;
    } catch (error) {
      console.error('获取微信Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 测试微信API连接
   */
  async testConnection() {
    try {
      const accessToken = await this.getAccessToken();
      
      // 测试获取公众号信息
      const axios = require('axios');
      const response = await axios.get(`https://api.weixin.qq.com/cgi-bin/get_current_selfmenu_info`, {
        params: {
          access_token: accessToken
        }
      });

      return {
        success: true,
        accessToken: accessToken.substring(0, 10) + '...',
        message: '微信API连接测试成功',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        message: `微信API连接测试失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 生成配置检查报告
   */
  generateConfigReport() {
    const status = this.getConfigStatus();
    const validation = this.validateConfig();
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      status,
      validation,
      recommendations: this.getRecommendations(status, validation),
      nextSteps: this.getNextSteps(validation)
    };
  }

  /**
   * 获取配置建议
   */
  getRecommendations(status, validation) {
    const recommendations = [];
    
    if (!validation.valid) {
      recommendations.push('请完成必要的配置项设置');
    }
    
    if (!status.encodingAESKey) {
      recommendations.push('建议配置EncodingAESKey以提高消息安全性');
    }
    
    if (process.env.NODE_ENV === 'production' && !process.env.WECHAT_CONFIG_KEY) {
      recommendations.push('生产环境建议设置独立的配置加密密钥');
    }
    
    return recommendations;
  }

  /**
   * 获取下一步操作建议
   */
  getNextSteps(validation) {
    if (!validation.valid) {
      return [
        '1. 登录微信公众平台获取AppID和AppSecret',
        '2. 设置Token（建议使用随机字符串）',
        '3. 配置服务器URL和令牌验证',
        '4. 测试webhook连接',
        '5. 创建自定义菜单'
      ];
    }
    
    return [
      '1. 测试微信API连接',
      '2. 创建或更新自定义菜单',
      '3. 测试消息接收和响应',
      '4. 配置生产环境监控',
      '5. 设置备份和恢复策略'
    ];
  }
}

module.exports = WechatProductionConfig;