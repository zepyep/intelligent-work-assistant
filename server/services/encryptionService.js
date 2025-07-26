const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * 数据加密服务
 * 提供各种加密、解密和哈希功能
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = process.env.ENCRYPTION_SECRET || this.generateDefaultKey();
    this.ivLength = 16; // 初始化向量长度
    this.tagLength = 16; // 认证标签长度
  }

  /**
   * 生成默认加密密钥（生产环境应该设置环境变量）
   */
  generateDefaultKey() {
    console.warn('⚠️ 使用默认加密密钥，请在生产环境设置 ENCRYPTION_SECRET 环境变量');
    return crypto.scryptSync('intelligent-work-assistant', 'salt', 32);
  }

  /**
   * 生成随机密钥
   * @param {number} length 密钥长度
   * @returns {string} Base64编码的密钥
   */
  generateKey(length = 32) {
    return crypto.randomBytes(length).toString('base64');
  }

  /**
   * 加密敏感数据
   * @param {string} text 要加密的文本
   * @param {string} customKey 自定义密钥（可选）
   * @returns {object} 包含加密数据和元信息的对象
   */
  encrypt(text, customKey = null) {
    try {
      const key = customKey ? 
        crypto.scryptSync(customKey, 'salt', 32) : 
        this.secretKey;
      
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key, { iv });
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {\n        encryptedData: encrypted,\n        iv: iv.toString('hex'),\n        tag: tag.toString('hex'),\n        algorithm: this.algorithm,\n        timestamp: new Date().toISOString()\n      };\n    } catch (error) {\n      throw new Error(`加密失败: ${error.message}`);\n    }\n  }\n\n  /**\n   * 解密数据\n   * @param {object} encryptedObj 加密对象\n   * @param {string} customKey 自定义密钥（可选）\n   * @returns {string} 解密后的文本\n   */\n  decrypt(encryptedObj, customKey = null) {\n    try {\n      const { encryptedData, iv, tag } = encryptedObj;\n      \n      const key = customKey ? \n        crypto.scryptSync(customKey, 'salt', 32) : \n        this.secretKey;\n      \n      const decipher = crypto.createDecipher(this.algorithm, key, { \n        iv: Buffer.from(iv, 'hex') \n      });\n      decipher.setAuthTag(Buffer.from(tag, 'hex'));\n      \n      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');\n      decrypted += decipher.final('utf8');\n      \n      return decrypted;\n    } catch (error) {\n      throw new Error(`解密失败: ${error.message}`);\n    }\n  }\n\n  /**\n   * 哈希密码\n   * @param {string} password 明文密码\n   * @param {number} saltRounds 盐轮数\n   * @returns {Promise<string>} 哈希后的密码\n   */\n  async hashPassword(password, saltRounds = 12) {\n    try {\n      return await bcrypt.hash(password, saltRounds);\n    } catch (error) {\n      throw new Error(`密码哈希失败: ${error.message}`);\n    }\n  }\n\n  /**\n   * 验证密码\n   * @param {string} password 明文密码\n   * @param {string} hashedPassword 哈希后的密码\n   * @returns {Promise<boolean>} 验证结果\n   */\n  async verifyPassword(password, hashedPassword) {\n    try {\n      return await bcrypt.compare(password, hashedPassword);\n    } catch (error) {\n      throw new Error(`密码验证失败: ${error.message}`);\n    }\n  }\n\n  /**\n   * 生成安全的随机token\n   * @param {number} length token长度\n   * @returns {string} 随机token\n   */\n  generateSecureToken(length = 32) {\n    return crypto.randomBytes(length).toString('hex');\n  }\n\n  /**\n   * 生成JWT密钥\n   * @returns {string} JWT密钥\n   */\n  generateJWTSecret() {\n    return crypto.randomBytes(64).toString('hex');\n  }\n\n  /**\n   * 创建数字签名\n   * @param {string} data 要签名的数据\n   * @param {string} privateKey 私钥\n   * @returns {string} 数字签名\n   */\n  createSignature(data, privateKey = null) {\n    try {\n      const key = privateKey || this.secretKey;\n      const hmac = crypto.createHmac('sha256', key);\n      hmac.update(data);\n      return hmac.digest('hex');\n    } catch (error) {\n      throw new Error(`创建签名失败: ${error.message}`);\n    }\n  }\n\n  /**\n   * 验证数字签名\n   * @param {string} data 原始数据\n   * @param {string} signature 签名\n   * @param {string} privateKey 私钥\n   * @returns {boolean} 验证结果\n   */\n  verifySignature(data, signature, privateKey = null) {\n    try {\n      const expectedSignature = this.createSignature(data, privateKey);\n      return crypto.timingSafeEqual(\n        Buffer.from(signature, 'hex'),\n        Buffer.from(expectedSignature, 'hex')\n      );\n    } catch (error) {\n      return false;\n    }\n  }\n\n  /**\n   * 哈希敏感数据（单向）\n   * @param {string} data 要哈希的数据\n   * @param {string} salt 盐值（可选）\n   * @returns {object} 哈希结果和盐值\n   */\n  hashSensitiveData(data, salt = null) {\n    try {\n      const actualSalt = salt || crypto.randomBytes(16).toString('hex');\n      const hash = crypto.scryptSync(data, actualSalt, 32);\n      \n      return {\n        hash: hash.toString('hex'),\n        salt: actualSalt,\n        algorithm: 'scrypt',\n        timestamp: new Date().toISOString()\n      };\n    } catch (error) {\n      throw new Error(`数据哈希失败: ${error.message}`);\n    }\n  }\n\n  /**\n   * 验证哈希数据\n   * @param {string} data 原始数据\n   * @param {string} hash 存储的哈希值\n   * @param {string} salt 盐值\n   * @returns {boolean} 验证结果\n   */\n  verifyHashedData(data, hash, salt) {\n    try {\n      const computedHash = crypto.scryptSync(data, salt, 32);\n      return crypto.timingSafeEqual(\n        Buffer.from(hash, 'hex'),\n        computedHash\n      );\n    } catch (error) {\n      return false;\n    }\n  }\n\n  /**\n   * 加密用户敏感信息（如身份证、手机号）\n   * @param {string} sensitiveInfo 敏感信息\n   * @returns {object} 加密结果\n   */\n  encryptUserSensitiveInfo(sensitiveInfo) {\n    return this.encrypt(sensitiveInfo, process.env.USER_DATA_KEY);\n  }\n\n  /**\n   * 解密用户敏感信息\n   * @param {object} encryptedInfo 加密的敏感信息\n   * @returns {string} 解密后的信息\n   */\n  decryptUserSensitiveInfo(encryptedInfo) {\n    return this.decrypt(encryptedInfo, process.env.USER_DATA_KEY);\n  }\n\n  /**\n   * 生成会话ID\n   * @returns {string} 安全的会话ID\n   */\n  generateSessionId() {\n    const timestamp = Date.now().toString();\n    const randomBytes = crypto.randomBytes(16).toString('hex');\n    return crypto.createHash('sha256')\n      .update(timestamp + randomBytes)\n      .digest('hex');\n  }\n\n  /**\n   * 加密WeChat相关的敏感数据\n   * @param {object} wechatData WeChat数据\n   * @returns {object} 加密后的数据\n   */\n  encryptWechatData(wechatData) {\n    const dataStr = JSON.stringify(wechatData);\n    return this.encrypt(dataStr, process.env.WECHAT_ENCRYPTION_KEY);\n  }\n\n  /**\n   * 解密WeChat相关的敏感数据\n   * @param {object} encryptedWechatData 加密的WeChat数据\n   * @returns {object} 解密后的数据\n   */\n  decryptWechatData(encryptedWechatData) {\n    const decryptedStr = this.decrypt(encryptedWechatData, process.env.WECHAT_ENCRYPTION_KEY);\n    return JSON.parse(decryptedStr);\n  }\n\n  /**\n   * 生成API访问token\n   * @param {object} payload token载荷\n   * @param {number} expiresIn 过期时间（秒）\n   * @returns {string} 加密的token\n   */\n  generateAPIToken(payload, expiresIn = 3600) {\n    const tokenData = {\n      ...payload,\n      iat: Math.floor(Date.now() / 1000),\n      exp: Math.floor(Date.now() / 1000) + expiresIn\n    };\n    \n    return this.encrypt(JSON.stringify(tokenData), process.env.API_TOKEN_KEY);\n  }\n\n  /**\n   * 验证并解析API访问token\n   * @param {string} encryptedToken 加密的token\n   * @returns {object|null} 解密后的token数据或null\n   */\n  verifyAPIToken(encryptedToken) {\n    try {\n      const decryptedData = this.decrypt(\n        typeof encryptedToken === 'string' ? \n          JSON.parse(encryptedToken) : \n          encryptedToken,\n        process.env.API_TOKEN_KEY\n      );\n      \n      const tokenData = JSON.parse(decryptedData);\n      \n      // 检查token是否过期\n      if (tokenData.exp && tokenData.exp < Math.floor(Date.now() / 1000)) {\n        return null;\n      }\n      \n      return tokenData;\n    } catch (error) {\n      return null;\n    }\n  }\n\n  /**\n   * 数据脱敏\n   * @param {string} data 原始数据\n   * @param {string} type 数据类型（phone, email, idcard, etc.）\n   * @returns {string} 脱敏后的数据\n   */\n  maskSensitiveData(data, type) {\n    if (!data) return '';\n    \n    switch (type) {\n      case 'phone':\n        return data.replace(/(\\d{3})\\d{4}(\\d{4})/, '$1****$2');\n      case 'email':\n        const [username, domain] = data.split('@');\n        const maskedUsername = username.length > 2 ? \n          username.slice(0, 2) + '***' + username.slice(-1) : \n          username;\n        return `${maskedUsername}@${domain}`;\n      case 'idcard':\n        return data.replace(/(\\d{6})\\d{8}(\\d{4})/, '$1********$2');\n      case 'bankcard':\n        return data.replace(/(\\d{4})\\d+(\\d{4})/, '$1****$2');\n      case 'name':\n        if (data.length <= 2) return data;\n        return data.charAt(0) + '*'.repeat(data.length - 2) + data.charAt(data.length - 1);\n      default:\n        return data.length > 4 ? \n          data.slice(0, 2) + '***' + data.slice(-2) : \n          '***';\n    }\n  }\n}\n\nmodule.exports = new EncryptionService();"