const Notification = require('../models/Notification');
const User = require('../models/User');
const wechatService = require('./wechatService');
const emailService = require('./emailService');

/**
 * 通知服务类
 */
class NotificationService {
  
  /**
   * 创建通知
   * @param {Object} notificationData - 通知数据
   * @param {string} notificationData.title - 标题
   * @param {string} notificationData.content - 内容
   * @param {string} notificationData.type - 类型
   * @param {string} notificationData.userId - 接收者ID
   * @param {Object} options - 选项
   */
  static async createNotification(notificationData, options = {}) {
    try {
      // 获取用户信息
      const user = await User.findById(notificationData.userId).select('username email wechatBinding preferences');
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户通知偏好设置
      const userPrefs = user.preferences?.notifications || {};
      const channels = {
        wechat: {
          enabled: userPrefs.wechat && user.wechatBinding?.isVerified,
          sent: false
        },
        email: {
          enabled: userPrefs.email && user.email,
          sent: false
        },
        web: {
          enabled: true,
          read: false
        }
      };

      // 根据通知类型调整渠道设置
      if (notificationData.type === 'task_reminder' && !userPrefs.taskReminders) {
        channels.wechat.enabled = false;
        channels.email.enabled = false;
      }
      if (notificationData.type === 'meeting_reminder' && !userPrefs.meetingReminders) {
        channels.wechat.enabled = false;
        channels.email.enabled = false;
      }

      // 创建通知记录
      const notification = new Notification({
        title: notificationData.title,
        content: notificationData.content,
        type: notificationData.type,
        priority: options.priority || 'normal',
        recipient: {
          userId: user._id,
          username: user.username,
          email: user.email,
          wechatOpenId: user.wechatBinding?.openid
        },
        channels,
        scheduledFor: options.scheduledFor || new Date(),
        relatedData: options.relatedData || {},
        metadata: {
          source: options.source || 'system',
          userAgent: options.userAgent,
          clientIp: options.clientIp,
          tags: options.tags || []
        }
      });

      await notification.save();
      
      console.log(`📢 通知创建成功: ${notification.title} (ID: ${notification._id})`);
      
      // 如果是紧急通知，立即发送
      if (options.priority === 'urgent' || options.immediate) {
        await this.sendNotification(notification._id);
      }

      return notification;
    } catch (error) {
      console.error('❌ 创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送单个通知
   * @param {string} notificationId - 通知ID
   */
  static async sendNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('通知不存在');
      }

      if (!notification.shouldSend) {
        console.log(`⏸️  通知 ${notificationId} 暂不需要发送`);
        return false;
      }

      let hasSuccess = false;

      // 发送微信通知
      if (notification.channels.wechat.enabled && !notification.channels.wechat.sent) {
        try {
          await this.sendWechatNotification(notification);
          hasSuccess = true;
        } catch (error) {
          console.error(`❌ 微信通知发送失败 (${notificationId}):`, error.message);
          await notification.markAsFailed('wechat', error.message);
        }
      }

      // 发送邮件通知
      if (notification.channels.email.enabled && !notification.channels.email.sent) {
        try {
          await this.sendEmailNotification(notification);
          hasSuccess = true;
        } catch (error) {
          console.error(`❌ 邮件通知发送失败 (${notificationId}):`, error.message);
          await notification.markAsFailed('email', error.message);
        }
      }

      // Web通知自动标记为已发送
      if (notification.channels.web.enabled) {
        hasSuccess = true;
      }

      if (hasSuccess) {
        console.log(`✅ 通知发送成功: ${notification.title}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 发送通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送微信通知
   * @param {Object} notification - 通知对象
   */
  static async sendWechatNotification(notification) {
    if (!notification.recipient.wechatOpenId) {
      throw new Error('用户未绑定微信');
    }

    // 创建 WeChat 服务实例
    const WechatService = require('./wechatService');
    const wechatServiceInstance = new WechatService();
    
    // 发送微信消息
    const result = await wechatServiceInstance.sendNotification(
      notification.recipient.wechatOpenId,
      {
        title: notification.title,
        content: notification.content,
        type: notification.type
      }
    );

    // 标记为已发送
    await notification.markAsSent('wechat', result.result?.messageId || 'sent');
    return result;
  }

  /**
   * 发送邮件通知
   * @param {Object} notification - 通知对象
   */
  static async sendEmailNotification(notification) {
    if (!notification.recipient.email) {
      throw new Error('用户邮箱未设置');
    }

    // 检查是否有邮件服务
    if (!emailService || typeof emailService.sendNotificationEmail !== 'function') {
      throw new Error('邮件服务未配置');
    }

    // 发送邮件
    const result = await emailService.sendNotificationEmail({
      to: notification.recipient.email,
      subject: notification.title,
      content: notification.content,
      type: notification.type,
      relatedData: notification.relatedData
    });

    // 标记为已发送
    await notification.markAsSent('email', result.messageId);
    return result;
  }

  /**
   * 格式化微信消息
   * @param {Object} notification - 通知对象
   */
  static formatWechatMessage(notification) {
    const typeEmojis = {
      task_reminder: '⏰',
      meeting_reminder: '📅',
      document_analysis: '📄',
      system_update: '🔔',
      task_update: '📋',
      calendar_sync: '🔄',
      general: '💬'
    };

    const priorityEmojis = {
      urgent: '🚨',
      high: '🔴',
      normal: '🟢',
      low: '🔵'
    };

    const emoji = typeEmojis[notification.type] || '📢';
    const priorityEmoji = priorityEmojis[notification.priority] || '';
    
    let message = `${emoji} ${priorityEmoji} **${notification.title}**\n\n`;
    message += `${notification.content}\n\n`;
    
    // 添加相关操作链接
    if (notification.relatedData.taskId) {
      message += `🔗 [查看任务详情]\n`;
    } else if (notification.relatedData.meetingId) {
      message += `🔗 [查看会议详情]\n`;
    } else if (notification.relatedData.documentId) {
      message += `🔗 [查看文档]\n`;
    }
    
    message += `\n⏱️ ${new Date().toLocaleString('zh-CN')}`;
    
    return message;
  }

  /**
   * 批量发送待处理通知
   */
  static async processPendingNotifications() {
    try {
      const pendingNotifications = await Notification.getPendingNotifications();
      console.log(`📮 开始处理 ${pendingNotifications.length} 个待发送通知`);

      let successCount = 0;
      let failCount = 0;

      for (const notification of pendingNotifications) {
        try {
          const success = await this.sendNotification(notification._id);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`❌ 处理通知失败 (${notification._id}):`, error.message);
          failCount++;
        }
      }

      console.log(`📊 通知处理完成: 成功 ${successCount}, 失败 ${failCount}`);
      return { successCount, failCount, total: pendingNotifications.length };
    } catch (error) {
      console.error('❌ 批量处理通知失败:', error);
      throw error;
    }
  }

  /**
   * 重试失败的通知
   */
  static async retryFailedNotifications() {
    try {
      const retryableNotifications = await Notification.getRetryableNotifications();
      console.log(`🔄 开始重试 ${retryableNotifications.length} 个失败通知`);

      let retryCount = 0;
      for (const notification of retryableNotifications) {
        try {
          await this.sendNotification(notification._id);
          retryCount++;
        } catch (error) {
          console.error(`❌ 重试通知失败 (${notification._id}):`, error.message);
        }
      }

      console.log(`🔄 重试完成: ${retryCount}/${retryableNotifications.length}`);
      return retryCount;
    } catch (error) {
      console.error('❌ 重试失败通知出错:', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      return await Notification.getUserNotifications(userId, options);
    } catch (error) {
      console.error('❌ 获取用户通知失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID
   */
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        'recipient.userId': userId
      });

      if (!notification) {
        throw new Error('通知不存在或无权访问');
      }

      await notification.markAsRead();
      console.log(`✅ 通知已标记为已读: ${notificationId}`);
      return notification;
    } catch (error) {
      console.error('❌ 标记通知已读失败:', error);
      throw error;
    }
  }

  /**
   * 批量标记通知为已读
   * @param {string} userId - 用户ID
   * @param {Array} notificationIds - 通知ID数组
   */
  static async markMultipleAsRead(userId, notificationIds = []) {
    try {
      const query = { 'recipient.userId': userId };
      
      if (notificationIds.length > 0) {
        query._id = { $in: notificationIds };
      } else {
        // 标记所有未读通知
        query['channels.web.read'] = { $ne: true };
      }

      const result = await Notification.updateMany(query, {
        'channels.web.read': true,
        'channels.web.readAt': new Date(),
        status: 'read'
      });

      console.log(`✅ 批量标记已读: ${result.modifiedCount} 个通知`);
      return result.modifiedCount;
    } catch (error) {
      console.error('❌ 批量标记已读失败:', error);
      throw error;
    }
  }

  /**
   * 创建任务提醒通知
   * @param {Object} task - 任务对象
   * @param {string} reminderType - 提醒类型 (deadline, status_change)
   */
  static async createTaskReminder(task, reminderType = 'deadline') {
    const titles = {
      deadline: `⏰ 任务即将截止: ${task.title}`,
      status_change: `📋 任务状态更新: ${task.title}`
    };

    const contents = {
      deadline: `您的任务"${task.title}"将在 ${new Date(task.dueDate).toLocaleDateString('zh-CN')} 截止，请及时处理。`,
      status_change: `您的任务"${task.title}"状态已更新为: ${task.status}`
    };

    return await this.createNotification({
      title: titles[reminderType],
      content: contents[reminderType],
      type: 'task_reminder',
      userId: task.assigneeId || task.createdBy
    }, {
      priority: reminderType === 'deadline' ? 'high' : 'normal',
      relatedData: { taskId: task._id }
    });
  }

  /**
   * 创建会议提醒通知
   * @param {Object} meeting - 会议对象
   * @param {number} reminderMinutes - 提前提醒分钟数
   */
  static async createMeetingReminder(meeting, reminderMinutes = 15) {
    const meetingTime = new Date(meeting.date).toLocaleString('zh-CN');
    
    return await this.createNotification({
      title: `📅 会议提醒: ${meeting.title}`,
      content: `您的会议"${meeting.title}"将在${reminderMinutes}分钟后开始 (${meetingTime})，请做好准备。`,
      type: 'meeting_reminder',
      userId: meeting.createdBy
    }, {
      priority: 'high',
      scheduledFor: new Date(new Date(meeting.date).getTime() - reminderMinutes * 60 * 1000),
      relatedData: { meetingId: meeting._id }
    });
  }

  /**
   * 创建文档分析完成通知
   * @param {Object} document - 文档对象
   * @param {Object} analysisResult - 分析结果
   */
  static async createDocumentAnalysisNotification(document, analysisResult) {
    return await this.createNotification({
      title: `📄 文档分析完成: ${document.originalName}`,
      content: `您上传的文档"${document.originalName}"分析完成，发现 ${analysisResult.keyPoints?.length || 0} 个关键要点。`,
      type: 'document_analysis',
      userId: document.uploadedBy
    }, {
      priority: 'normal',
      relatedData: { documentId: document._id }
    });
  }

  /**
   * 清理过期通知
   */
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`🗑️  清理过期通知: ${result.deletedCount} 条`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ 清理过期通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取通知统计信息
   * @param {string} userId - 用户ID (可选)
   */
  static async getNotificationStats(userId = null) {
    try {
      const matchQuery = userId ? { 'recipient.userId': userId } : {};
      
      const stats = await Notification.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: {
                $cond: [{ $ne: ['$channels.web.read', true] }, 1, 0]
              }
            },
            byType: {
              $push: {
                type: '$type',
                priority: '$priority',
                status: '$status'
              }
            },
            byStatus: {
              $push: '$status'
            }
          }
        }
      ]);

      return stats[0] || { total: 0, unread: 0, byType: [], byStatus: [] };
    } catch (error) {
      console.error('❌ 获取通知统计失败:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;