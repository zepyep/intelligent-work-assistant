const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, '通知标题不能为空'],
    maxlength: [100, '标题长度不能超过100字符']
  },
  content: {
    type: String,
    required: [true, '通知内容不能为空'],
    maxlength: [500, '内容长度不能超过500字符']
  },
  type: {
    type: String,
    enum: ['task_reminder', 'meeting_reminder', 'document_analysis', 'system_update', 'task_update', 'calendar_sync', 'general'],
    required: [true, '通知类型不能为空']
  },
  
  // 优先级和状态
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },
  
  // 接收者信息
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '接收者用户ID不能为空']
    },
    username: {
      type: String,
      required: [true, '接收者用户名不能为空']
    },
    email: String,
    wechatOpenId: String
  },
  
  // 发送渠道
  channels: {
    wechat: {
      enabled: {
        type: Boolean,
        default: true
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      messageId: String,
      error: String
    },
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      messageId: String,
      error: String
    },
    web: {
      enabled: {
        type: Boolean,
        default: true
      },
      read: {
        type: Boolean,
        default: false
      },
      readAt: Date
    }
  },
  
  // 调度信息
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后过期
    }
  },
  
  // 关联数据
  relatedData: {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting'
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    calendarEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Calendar'
    }
  },
  
  // 重试机制
  retryCount: {
    type: Number,
    default: 0,
    max: [3, '重试次数不能超过3次']
  },
  lastRetryAt: Date,
  nextRetryAt: Date,
  
  // 元数据
  metadata: {
    source: {
      type: String,
      default: 'system'
    },
    userAgent: String,
    clientIp: String,
    tags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
notificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ type: 1, priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // 自动删除过期通知

// 虚拟字段
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retryCount < 3;
});

notificationSchema.virtual('shouldSend').get(function() {
  return this.status === 'pending' && 
         this.scheduledFor <= new Date() && 
         !this.isExpired;
});

// 实例方法
notificationSchema.methods.markAsSent = function(channel, messageId) {
  this.channels[channel].sent = true;
  this.channels[channel].sentAt = new Date();
  if (messageId) {
    this.channels[channel].messageId = messageId;
  }
  
  // 检查是否所有启用的渠道都已发送
  const enabledChannels = Object.keys(this.channels).filter(ch => this.channels[ch].enabled);
  const sentChannels = enabledChannels.filter(ch => this.channels[ch].sent);
  
  if (sentChannels.length === enabledChannels.length) {
    this.status = 'sent';
  }
  
  return this.save();
};

notificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  return this.save();
};

notificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.channels.web.read = true;
  this.channels.web.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsFailed = function(channel, error) {
  this.channels[channel].error = error;
  this.status = 'failed';
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  
  if (this.canRetry) {
    // 设置下次重试时间（指数退避）
    const delayMinutes = Math.pow(2, this.retryCount) * 5; // 5, 10, 20 分钟
    this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }
  
  return this.save();
};

// 静态方法
notificationSchema.statics.getPendingNotifications = function() {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() },
    expiresAt: { $gt: new Date() }
  }).sort({ priority: -1, scheduledFor: 1 });
};

notificationSchema.statics.getRetryableNotifications = function() {
  return this.find({
    status: 'failed',
    retryCount: { $lt: 3 },
    nextRetryAt: { $lte: new Date() },
    expiresAt: { $gt: new Date() }
  });
};

notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const query = { 'recipient.userId': userId };
  const { 
    status, 
    type, 
    unreadOnly = false, 
    limit = 20, 
    skip = 0 
  } = options;
  
  if (status) query.status = status;
  if (type) query.type = type;
  if (unreadOnly) query['channels.web.read'] = { $ne: true };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('relatedData.taskId', 'title status priority')
    .populate('relatedData.meetingId', 'title date')
    .populate('relatedData.documentId', 'originalName fileType')
    .populate('relatedData.calendarEventId', 'title startTime');
};

// 预保存中间件
notificationSchema.pre('save', function(next) {
  // 设置优先级对应的调度时间调整
  if (this.isNew && this.priority === 'urgent') {
    this.scheduledFor = new Date(); // 立即发送
  }
  next();
});

// 导出优先级映射
notificationSchema.statics.PRIORITY_ORDER = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1
};

module.exports = mongoose.model('Notification', notificationSchema);