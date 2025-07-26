/**
 * 邮件服务 (模拟实现)
 * 在生产环境中应该集成真实的邮件服务提供商，如SendGrid、阿里云邮件等
 */

class EmailService {
  
  /**
   * 发送通知邮件
   * @param {Object} emailData - 邮件数据
   * @param {string} emailData.to - 收件人
   * @param {string} emailData.subject - 主题
   * @param {string} emailData.content - 内容
   * @param {string} emailData.type - 通知类型
   */
  static async sendNotificationEmail(emailData) {
    try {
      console.log('📧 模拟发送邮件通知:');
      console.log(`   收件人: ${emailData.to}`);
      console.log(`   主题: ${emailData.subject}`);
      console.log(`   内容: ${emailData.content}`);
      console.log(`   类型: ${emailData.type}`);
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 模拟成功响应
      return {
        success: true,
        messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ 邮件发送失败:', error);
      throw new Error('邮件发送服务暂时不可用');
    }
  }

  /**
   * 发送验证邮件
   * @param {string} email - 邮箱地址
   * @param {string} verificationCode - 验证码
   */
  static async sendVerificationEmail(email, verificationCode) {
    return await this.sendNotificationEmail({
      to: email,
      subject: '智能工作助手 - 邮箱验证',
      content: `您的验证码是: ${verificationCode}，有效期5分钟。`,
      type: 'verification'
    });
  }

  /**
   * 发送密码重置邮件
   * @param {string} email - 邮箱地址
   * @param {string} resetToken - 重置令牌
   */
  static async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return await this.sendNotificationEmail({
      to: email,
      subject: '智能工作助手 - 密码重置',
      content: `请点击以下链接重置您的密码: ${resetUrl}\n\n如果您没有请求重置密码，请忽略此邮件。`,
      type: 'password_reset'
    });
  }

  /**
   * 发送系统通知邮件
   * @param {Array} recipients - 收件人列表
   * @param {string} subject - 主题
   * @param {string} content - 内容
   */
  static async sendBulkNotification(recipients, subject, content) {
    const results = [];
    
    for (const email of recipients) {
      try {
        const result = await this.sendNotificationEmail({
          to: email,
          subject,
          content,
          type: 'bulk_notification'
        });
        results.push({ email, success: true, messageId: result.messageId });
      } catch (error) {
        console.error(`❌ 发送到 ${email} 失败:`, error.message);
        results.push({ email, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱地址
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 获取邮件模板
   * @param {string} type - 模板类型
   * @param {Object} data - 模板数据
   */
  static getEmailTemplate(type, data) {
    const templates = {
      task_reminder: {
        subject: `⏰ 任务提醒: ${data.taskTitle}`,
        content: `
          <h2>任务提醒</h2>
          <p>您好 ${data.username}，</p>
          <p>您有一个任务即将截止：</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2196f3;">
            <h3>${data.taskTitle}</h3>
            <p><strong>截止时间:</strong> ${data.dueDate}</p>
            <p><strong>优先级:</strong> ${data.priority}</p>
            <p><strong>描述:</strong> ${data.description}</p>
          </div>
          <p>请及时处理该任务。</p>
          <p>智能工作助手团队</p>
        `
      },
      meeting_reminder: {
        subject: `📅 会议提醒: ${data.meetingTitle}`,
        content: `
          <h2>会议提醒</h2>
          <p>您好 ${data.username}，</p>
          <p>您有一个会议即将开始：</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #ff9800;">
            <h3>${data.meetingTitle}</h3>
            <p><strong>时间:</strong> ${data.meetingTime}</p>
            <p><strong>地点:</strong> ${data.location || '线上会议'}</p>
            <p><strong>参与者:</strong> ${data.attendees?.join(', ')}</p>
          </div>
          <p>请准时参加会议。</p>
          <p>智能工作助手团队</p>
        `
      }
    };

    return templates[type] || {
      subject: data.subject || '智能工作助手通知',
      content: data.content || '您有新的通知消息。'
    };
  }
}

// 在生产环境中，可以在这里配置真实的邮件服务
// 例如使用nodemailer + SendGrid/阿里云邮件推送等
if (process.env.NODE_ENV === 'production') {
  console.log('⚠️  生产环境提醒: 请配置真实的邮件服务提供商');
}

module.exports = EmailService;