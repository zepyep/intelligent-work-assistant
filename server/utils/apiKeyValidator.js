/**
 * API密钥验证工具
 * 用于验证各种AI服务提供商的API密钥格式和有效性
 */

const axios = require('axios');

class APIKeyValidator {
  /**
   * 验证通义千问API密钥
   * @param {string} apiKey API密钥
   * @returns {Promise<{valid: boolean, message: string, details?: any}>}
   */
  static async validateQwenApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        valid: false,
        message: 'API密钥不能为空且必须为字符串'
      };
    }

    // 检查API密钥格式 (通义千问密钥通常以sk_开头)
    if (!apiKey.startsWith('sk_')) {
      return {
        valid: false,
        message: '通义千问API密钥格式可能不正确，通常以"sk_"开头'
      };
    }

    // 尝试调用API验证密钥有效性
    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-turbo',
          input: {
            messages: [
              { role: 'user', content: 'test' }
            ]
          },
          parameters: {
            max_tokens: 10
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-SSE': 'disable'
          },
          timeout: 10000 // 10秒超时
        }
      );

      return {
        valid: true,
        message: 'API密钥验证成功',
        details: {
          usage: response.data.usage,
          model: response.data.model
        }
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 401) {
          return {
            valid: false,
            message: 'API密钥无效或已过期',
            details: errorData
          };
        } else if (status === 429) {
          return {
            valid: true, // 密钥有效，但达到了调用限制
            message: 'API密钥有效，但已达到调用限制',
            details: errorData
          };
        } else if (status === 400) {
          // 如果是参数错误但认证通过，说明密钥是有效的
          if (!errorData?.code?.includes('Invalid') && !errorData?.code?.includes('Unauthorized')) {
            return {
              valid: true,
              message: 'API密钥有效',
              details: errorData
            };
          }
        }
      }

      return {
        valid: false,
        message: `API密钥验证失败: ${error.response?.data?.message || error.message}`,
        details: error.response?.data
      };
    }
  }

  /**
   * 验证OpenAI API密钥
   * @param {string} apiKey API密钥
   * @returns {Promise<{valid: boolean, message: string}>}
   */
  static async validateOpenAIApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        valid: false,
        message: 'OpenAI API密钥不能为空'
      };
    }

    if (!apiKey.startsWith('sk-')) {
      return {
        valid: false,
        message: 'OpenAI API密钥格式错误，应该以"sk-"开头'
      };
    }

    try {
      const { OpenAI } = require('openai');
      const client = new OpenAI({ apiKey });
      
      // 尝试调用模型列表API来验证密钥
      await client.models.list();
      
      return {
        valid: true,
        message: 'OpenAI API密钥验证成功'
      };
    } catch (error) {
      return {
        valid: false,
        message: `OpenAI API密钥验证失败: ${error.message}`
      };
    }
  }

  /**
   * 验证PPIO派欧云平台API密钥
   * @param {string} apiKey API密钥
   * @returns {Promise<{valid: boolean, message: string, details?: any}>}
   */
  static async validatePPIOApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        valid: false,
        message: 'PPIO API密钥不能为空且必须为字符串'
      };
    }

    // 检查API密钥格式 (PPIO密钥通常以sk_开头)
    if (!apiKey.startsWith('sk_')) {
      return {
        valid: false,
        message: 'PPIO API密钥格式可能不正确，通常以"sk_"开头'
      };
    }

    // 尝试调用API验证密钥有效性
    try {
      const response = await axios.post(
        'https://api.ppio.cloud/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: 'test' }
          ],
          max_tokens: 5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 10000 // 10秒超时
        }
      );

      return {
        valid: true,
        message: 'PPIO API密钥验证成功',
        details: {
          usage: response.data.usage,
          model: response.data.model
        }
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 401) {
          return {
            valid: false,
            message: 'PPIO API密钥无效或已过期',
            details: errorData
          };
        } else if (status === 429) {
          return {
            valid: true, // 密钥有效，但达到了调用限制
            message: 'PPIO API密钥有效，但已达到调用限制',
            details: errorData
          };
        } else if (status === 400) {
          // 如果是参数错误但认证通过，说明密钥是有效的
          return {
            valid: true,
            message: 'PPIO API密钥有效',
            details: errorData
          };
        }
      }

      return {
        valid: false,
        message: `PPIO API密钥验证失败: ${error.response?.data?.error?.message || error.message}`,
        details: error.response?.data
      };
    }
  }

  /**
   * 验证所有配置的AI服务API密钥
   * @returns {Promise<Object>}
   */
  static async validateAllApiKeys() {
    const results = {};

    // 验证PPIO派欧云平台
    if (process.env.PPIO_API_KEY) {
      console.log('🔍 正在验证PPIO派欧云平台API密钥...');
      results.ppio = await this.validatePPIOApiKey(process.env.PPIO_API_KEY);
    } else {
      results.ppio = { valid: false, message: '未配置PPIO API密钥' };
    }

    // 验证通义千问
    if (process.env.QWEN_API_KEY && process.env.QWEN_API_KEY !== 'your-qwen-api-key') {
      console.log('🔍 正在验证通义千问API密钥...');
      results.qwen = await this.validateQwenApiKey(process.env.QWEN_API_KEY);
    } else {
      results.qwen = { valid: false, message: '未配置通义千问API密钥' };
    }

    // 验证OpenAI
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key') {
      console.log('🔍 正在验证OpenAI API密钥...');
      results.openai = await this.validateOpenAIApiKey(process.env.OPENAI_API_KEY);
    } else {
      results.openai = { valid: false, message: '未配置OpenAI API密钥' };
    }

    return results;
  }

  /**
   * 获取API密钥配置建议
   * @returns {Object}
   */
  static getConfigurationGuide() {
    return {
      ppio: {
        name: 'PPIO派欧云平台',
        steps: [
          '1. 访问 https://www.ppio.cloud/',
          '2. 注册并登录PPIO账户',
          '3. 在控制台创建新的API密钥',
          '4. 将API密钥配置到环境变量 PPIO_API_KEY',
          '5. 确保账户有足够的调用额度',
          '6. 使用Bearer认证方式: "Authorization: Bearer {API 密钥}"'
        ],
        format: 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authentication: 'Bearer Token',
        required_permissions: ['chat.completions']
      },
      qwen: {
        name: '通义千问 (阿里云DashScope)',
        steps: [
          '1. 访问 https://dashscope.console.aliyun.com/',
          '2. 注册并登录阿里云账户',
          '3. 开通DashScope服务',
          '4. 在API-KEY管理页面创建新的API密钥',
          '5. 将API密钥配置到环境变量 QWEN_API_KEY',
          '6. 确保账户有足够的调用额度'
        ],
        format: 'sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required_permissions: ['aigc:Generation']
      },
      openai: {
        name: 'OpenAI',
        steps: [
          '1. 访问 https://platform.openai.com/',
          '2. 注册并登录OpenAI账户',
          '3. 在API页面创建新的API密钥',
          '4. 将API密钥配置到环境变量 OPENAI_API_KEY',
          '5. 确保账户有足够的使用额度'
        ],
        format: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        required_permissions: ['chat.completions']
      }
    };
  }
}

module.exports = APIKeyValidator;