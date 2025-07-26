const cron = require('node-cron');
const NotificationService = require('./notificationService');
const Notification = require('../models/Notification');

class SchedulerService {
  constructor() {
    this.notificationService = new NotificationService();
    this.jobs = new Map();
  }

  /**
   * 初始化调度器
   */
  async initialize() {
    console.log('🔄 初始化通知调度器...');
    
    // 每5分钟检查待发送通知
    this.scheduleJob('process-pending-notifications', '*/5 * * * *', async () => {
      await this.processPendingNotifications();
    });

    // 每小时清理过期通知
    this.scheduleJob('cleanup-expired-notifications', '0 * * * *', async () => {
      await this.cleanupExpiredNotifications();
    });

    // 每天午夜重试失败的通知
    this.scheduleJob('retry-failed-notifications', '0 0 * * *', async () => {
      await this.retryFailedNotifications();
    });

    console.log('✅ 通知调度器初始化完成');
  }

  /**
   * 添加调度任务
   */
  scheduleJob(name, cronPattern, task) {
    try {
      const job = cron.schedule(cronPattern, async () => {
        try {
          console.log(`🔄 执行调度任务: ${name}`);
          await task();
          console.log(`✅ 调度任务完成: ${name}`);
        } catch (error) {
          console.error(`❌ 调度任务失败 ${name}:`, error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      this.jobs.set(name, job);
      job.start();
      console.log(`📅 调度任务已启动: ${name} (${cronPattern})`);
    } catch (error) {
      console.error(`❌ 无法创建调度任务 ${name}:`, error);
    }
  }

  /**
   * 处理待发送通知
   */
  async processPendingNotifications() {
    try {
      // 查找所有待发送且未过期的通知
      const pendingNotifications = await Notification.find({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      }).populate('userId', 'username email position wechat');

      console.log(`📨 找到 ${pendingNotifications.length} 个待发送通知`);

      for (const notification of pendingNotifications) {
        try {
          const result = await this.notificationService.sendNotification(notification);
          console.log(`✅ 通知发送成功: ${notification._id} -> ${notification.channels.join(', ')}`);
        } catch (error) {
          console.error(`❌ 通知发送失败: ${notification._id}`, error);
        }
      }
    } catch (error) {
      console.error('❌ 处理待发送通知时出错:', error);
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        console.log(`🗑️  已清理 ${result.deletedCount} 个过期通知`);
      }
    } catch (error) {
      console.error('❌ 清理过期通知时出错:', error);
    }
  }

  /**
   * 重试失败通知
   */
  async retryFailedNotifications() {
    try {
      // 查找失败次数少于3次的失败通知
      const failedNotifications = await Notification.find({
        status: 'failed',
        retryCount: { $lt: 3 },
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      console.log(`🔄 找到 ${failedNotifications.length} 个可重试的失败通知`);

      for (const notification of failedNotifications) {
        try {
          // 重置状态为待发送
          notification.status = 'pending';
          notification.scheduledFor = new Date();
          await notification.save();
          
          console.log(`🔄 通知已重置为待发送状态: ${notification._id}`);
        } catch (error) {
          console.error(`❌ 重置通知状态失败: ${notification._id}`, error);
        }
      }
    } catch (error) {
      console.error('❌ 重试失败通知时出错:', error);
    }
  }

  /**
   * 发送即时通知
   */
  async sendImmediateNotification(userId, type, title, content, channels = ['web'], data = {}) {
    try {
      const notification = await this.notificationService.createNotification({
        userId,
        type,
        title,
        content,
        channels,
        data,
        scheduledFor: new Date()
      });

      const result = await this.notificationService.sendNotification(notification);
      console.log(`⚡ 即时通知发送成功: ${notification._id}`);
      return result;
    } catch (error) {
      console.error('❌ 发送即时通知失败:', error);
      throw error;
    }
  }

  /**
   * 停止所有调度任务
   */
  stopAll() {
    console.log('⏹️  停止所有通知调度任务...');
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`⏹️  已停止调度任务: ${name}`);
    }
    this.jobs.clear();
  }

  /**
   * 获取调度任务状态
   */
  getStatus() {
    const jobs = Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.running
    }));

    return {
      initialized: this.jobs.size > 0,
      totalJobs: this.jobs.size,
      jobs
    };
  }
}

module.exports = SchedulerService;