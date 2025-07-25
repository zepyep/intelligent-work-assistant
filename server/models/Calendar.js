const mongoose = require('mongoose');

const CalendarSchema = new mongoose.Schema({
  // 事件基本信息
  title: {
    type: String,
    required: [true, '请提供事件标题'],
    trim: true,
    maxlength: [300, '事件标题不能超过300个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, '事件描述不能超过2000个字符']
  },
  
  // 时间信息
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  timezone: {
    type: String,
    default: 'Asia/Shanghai'
  },
  
  // 事件类型
  eventType: {
    type: String,
    enum: [
      'meeting',      // 会议
      'task',         // 任务
      'deadline',     // 截止日期
      'reminder',     // 提醒
      'appointment',  // 约会
      'break',        // 休息
      'travel',       // 出行
      'personal',     // 个人事务
      'holiday',      // 假期
      'other'         // 其他
    ],
    default: 'other'
  },
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // 事件状态
  status: {
    type: String,
    enum: ['tentative', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  
  // 创建者/所有者
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 参与者（对于会议事件）
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String, // 外部参与者邮箱
    name: String,  // 外部参与者姓名
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'tentative', 'no_response'],
      default: 'invited'
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  
  // 地点信息
  location: {
    address: String,
    room: String,
    isOnline: {
      type: Boolean,
      default: false
    },
    onlineLink: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // 重复设置
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      default: 1
    },
    daysOfWeek: [Number], // 0-6，周日到周六
    dayOfMonth: Number,   // 每月的第几天
    weekOfMonth: Number,  // 每月的第几周
    endDate: Date,
    occurrences: Number,  // 重复次数
    exceptions: [Date]    // 例外日期
  },
  
  // 提醒设置
  reminders: [{
    method: {
      type: String,
      enum: ['email', 'wechat', 'popup', 'sms'],
      default: 'popup'
    },
    minutes: {
      type: Number,
      default: 15 // 提前15分钟提醒
    },
    sent: {
      type: Boolean,
      default: false
    }
  }],
  
  // 附件
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 标签和分类
  tags: [String],
  category: String,
  
  // 外部日历集成
  externalCalendars: [{
    provider: {
      type: String,
      enum: ['google', 'outlook', 'apple', 'exchange'],
      required: true
    },
    externalId: String,        // 外部系统中的事件ID
    calendarId: String,        // 外部日历ID
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed'],
      default: 'pending'
    },
    lastSyncAt: Date,
    syncError: String
  }],
  
  // 关联的任务或会议
  relatedItems: [{
    itemType: {
      type: String,
      enum: ['task', 'meeting', 'document'],
      required: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'relatedItems.itemType'
    }
  }],
  
  // 可见性设置
  visibility: {
    type: String,
    enum: ['public', 'private', 'confidential'],
    default: 'private'
  },
  
  // 空闲/忙碌状态
  showAs: {
    type: String,
    enum: ['free', 'busy', 'tentative', 'out_of_office'],
    default: 'busy'
  },
  
  // 会议室预订（如果适用）
  roomBooking: {
    roomId: String,
    roomName: String,
    capacity: Number,
    equipment: [String],
    bookingStatus: {
      type: String,
      enum: ['booked', 'pending', 'cancelled'],
      default: 'booked'
    }
  },
  
  // 颜色标识
  color: {
    type: String,
    default: '#3174ad' // 默认蓝色
  },
  
  // 笔记和评论
  notes: String,
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 元数据
  metadata: {
    createdVia: {
      type: String,
      enum: ['web', 'wechat', 'api', 'sync'],
      default: 'web'
    },
    source: String, // 数据来源
    customFields: [{
      key: String,
      value: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段 - 事件持续时间
CalendarSchema.virtual('duration').get(function() {
  if (this.isAllDay) return null;
  return Math.round((this.endTime - this.startTime) / (1000 * 60)); // 分钟
});

// 虚拟字段 - 是否正在进行
CalendarSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
});

// 虚拟字段 - 是否即将开始
CalendarSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  return this.startTime >= now && this.startTime <= oneHourLater;
});

// 索引
CalendarSchema.index({ owner: 1, startTime: 1 });
CalendarSchema.index({ startTime: 1, endTime: 1 });
CalendarSchema.index({ eventType: 1 });
CalendarSchema.index({ priority: 1 });
CalendarSchema.index({ status: 1 });
CalendarSchema.index({ 'participants.user': 1 });
CalendarSchema.index({ tags: 1 });

// 复合索引 - 时间范围查询
CalendarSchema.index({ owner: 1, startTime: 1, endTime: 1 });

// 文本搜索索引
CalendarSchema.index({
  title: 'text',
  description: 'text',
  'location.address': 'text'
});

// 中间件：验证时间逻辑
CalendarSchema.pre('save', function(next) {
  // 确保结束时间晚于开始时间
  if (this.endTime <= this.startTime) {
    return next(new Error('结束时间必须晚于开始时间'));
  }
  
  // 全天事件的时间处理
  if (this.isAllDay) {
    this.startTime.setHours(0, 0, 0, 0);
    this.endTime.setHours(23, 59, 59, 999);
  }
  
  next();
});

// 静态方法：获取用户指定时间范围的事件
CalendarSchema.statics.getUserEvents = async function(userId, startDate, endDate) {
  return await this.find({
    owner: userId,
    startTime: { $lte: endDate },
    endTime: { $gte: startDate },
    status: { $ne: 'cancelled' }
  }).sort({ startTime: 1 });
};

// 静态方法：检查时间冲突
CalendarSchema.statics.checkConflicts = async function(userId, startTime, endTime, excludeId = null) {
  const query = {
    owner: userId,
    status: { $ne: 'cancelled' },
    $or: [
      // 新事件开始时间在现有事件期间
      {
        startTime: { $lte: startTime },
        endTime: { $gt: startTime }
      },
      // 新事件结束时间在现有事件期间
      {
        startTime: { $lt: endTime },
        endTime: { $gte: endTime }
      },
      // 新事件完全包含现有事件
      {
        startTime: { $gte: startTime },
        endTime: { $lte: endTime }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return await this.find(query);
};

// 静态方法：获取用户的工作时间统计
CalendarSchema.statics.getUserWorkHours = async function(userId, startDate, endDate) {
  const events = await this.find({
    owner: userId,
    eventType: { $in: ['meeting', 'task', 'work'] },
    startTime: { $gte: startDate },
    endTime: { $lte: endDate },
    status: { $ne: 'cancelled' }
  });
  
  let totalMinutes = 0;
  events.forEach(event => {
    if (!event.isAllDay) {
      totalMinutes += (event.endTime - event.startTime) / (1000 * 60);
    }
  });
  
  return {
    totalHours: Math.round(totalMinutes / 60 * 100) / 100,
    totalMinutes,
    eventCount: events.length
  };
};

// 实例方法：添加参与者
CalendarSchema.methods.addParticipant = function(participant) {
  this.participants.push(participant);
  return this.save();
};

// 实例方法：更新同步状态
CalendarSchema.methods.updateSyncStatus = function(provider, status, error = null) {
  const external = this.externalCalendars.find(ext => ext.provider === provider);
  if (external) {
    external.syncStatus = status;
    external.lastSyncAt = new Date();
    if (error) {
      external.syncError = error;
    }
  }
  return this.save();
};

// 实例方法：生成重复事件
CalendarSchema.methods.generateRecurringEvents = function(endDate) {
  if (!this.recurring.isRecurring) return [];
  
  const events = [];
  let currentDate = new Date(this.startTime);
  const duration = this.endTime - this.startTime;
  
  while (currentDate <= endDate) {
    // 跳过例外日期
    const isException = this.recurring.exceptions.some(
      exception => exception.toDateString() === currentDate.toDateString()
    );
    
    if (!isException && currentDate > this.startTime) {
      const newEvent = {
        ...this.toObject(),
        _id: new mongoose.Types.ObjectId(),
        startTime: new Date(currentDate),
        endTime: new Date(currentDate.getTime() + duration),
        parentEvent: this._id
      };
      events.push(newEvent);
    }
    
    // 计算下一个重复日期
    switch (this.recurring.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + this.recurring.interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * this.recurring.interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + this.recurring.interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + this.recurring.interval);
        break;
    }
  }
  
  return events;
};

module.exports = mongoose.model('Calendar', CalendarSchema);