const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, '请提供会议标题'],
    trim: true,
    maxlength: [300, '会议标题不能超过300个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, '会议描述不能超过2000个字符']
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
  duration: Number, // 分钟
  
  // 地点信息
  location: {
    type: String,
    trim: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  meetingLink: String, // 在线会议链接
  
  // 组织者
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 参与者
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'presenter', 'participant', 'optional'],
      default: 'participant'
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'tentative', 'no_response'],
      default: 'invited'
    },
    responseAt: Date,
    actualAttendance: {
      type: String,
      enum: ['attended', 'absent', 'late', 'left_early']
    }
  }],
  
  // 会议类型
  type: {
    type: String,
    enum: ['meeting', 'presentation', 'workshop', 'interview', 'call', 'other'],
    default: 'meeting'
  },
  
  // 会议状态
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  
  // 重复设置
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    interval: Number,
    endDate: Date,
    occurrences: Number
  },
  
  // 音频文件
  audioFiles: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    duration: Number, // 秒
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // 转录结果
  transcription: {
    // 原始转录文本
    rawText: String,
    
    // 结构化转录（按发言人分段）
    segments: [{
      speaker: String, // 发言人
      startTime: Number, // 开始时间（秒）
      endTime: Number, // 结束时间（秒）
      text: String, // 发言内容
      confidence: Number // 置信度 0-1
    }],
    
    // 转录状态
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    
    // 转录服务信息
    service: String, // 使用的转录服务
    language: String, // 语言
    processedAt: Date,
    error: String
  },
  
  // AI分析结果
  aiAnalysis: {
    // 会议摘要
    summary: String,
    
    // 关键讨论点
    keyPoints: [String],
    
    // 决策记录
    decisions: [{
      decision: String,
      decidedBy: String,
      context: String,
      timestamp: Date
    }],
    
    // 行动项（按参与者职位个性化）
    actionItems: [{
      content: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      assignedToName: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      },
      dueDate: Date,
      category: String,
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date
    }],
    
    // 个性化建议（根据用户职位）
    personalizedSuggestions: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      position: String,
      suggestions: [String],
      actionItems: [String],
      followUpItems: [String]
    }],
    
    // 话题分析
    topics: [{
      topic: String,
      importance: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      timeSpent: Number, // 分钟
      participants: [String]
    }],
    
    // 情感分析
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'negative', 'neutral']
      },
      byParticipant: [{
        participant: String,
        sentiment: String,
        confidence: Number
      }]
    },
    
    // 分析时间
    analyzedAt: Date,
    
    // 分析状态
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    
    error: String
  },
  
  // 会议资料
  attachments: [{
    type: {
      type: String,
      enum: ['agenda', 'presentation', 'document', 'image', 'other']
    },
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 会议纪要
  minutes: {
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: Date,
    updatedAt: Date,
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date
  },
  
  // 标签
  tags: [String],
  
  // 项目关联
  project: {
    name: String,
    id: String
  },
  
  // 提醒设置
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'wechat', 'system']
    },
    time: Date, // 提醒时间
    sent: {
      type: Boolean,
      default: false
    },
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  
  // 后续会议
  followUpMeeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  },
  
  // 评分和反馈
  feedback: [{
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 元数据
  metadata: {
    createdVia: {
      type: String,
      enum: ['web', 'wechat', 'api', 'calendar_sync'],
      default: 'web'
    },
    externalId: String, // 外部系统ID（如Google Calendar）
    lastSyncAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段 - 会议状态（基于时间）
MeetingSchema.virtual('timeStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'cancelled' || this.status === 'postponed') {
    return this.status;
  }
  
  if (now < this.startTime) {
    return 'upcoming';
  } else if (now >= this.startTime && now <= this.endTime) {
    return 'ongoing';
  } else {
    return 'past';
  }
});

// 虚拟字段 - 参与者数量
MeetingSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// 虚拟字段 - 确认参与者数量
MeetingSchema.virtual('confirmedCount').get(function() {
  return this.participants.filter(p => p.status === 'accepted').length;
});

// 索引
MeetingSchema.index({ organizer: 1, startTime: 1 });
MeetingSchema.index({ 'participants.user': 1 });
MeetingSchema.index({ startTime: 1, endTime: 1 });
MeetingSchema.index({ status: 1 });
MeetingSchema.index({ tags: 1 });
MeetingSchema.index({ 'project.id': 1 });

// 文本搜索索引
MeetingSchema.index({
  title: 'text',
  description: 'text',
  'aiAnalysis.summary': 'text'
});

// 中间件：计算会议时长
MeetingSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  next();
});

// 静态方法：获取用户的会议统计
MeetingSchema.statics.getUserMeetingStats = async function(userId, timeRange = 'month') {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const stats = await this.aggregate([
    {
      $match: {
        $or: [
          { organizer: userId },
          { 'participants.user': userId }
        ],
        startTime: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    }
  ]);
  
  const result = {
    total: 0,
    totalDuration: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
    result.totalDuration += stat.totalDuration || 0;
  });
  
  return result;
};

// 实例方法：添加参与者
MeetingSchema.methods.addParticipant = function(userId, role = 'participant') {
  const exists = this.participants.find(p => p.user.toString() === userId.toString());
  if (!exists) {
    this.participants.push({ user: userId, role });
  }
  return this.save();
};

// 实例方法：更新参与状态
MeetingSchema.methods.updateParticipantStatus = function(userId, status) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = status;
    participant.responseAt = new Date();
  }
  return this.save();
};

// 实例方法：生成个性化行动清单
MeetingSchema.methods.generatePersonalizedActionItems = async function(userId) {
  if (!this.aiAnalysis || !this.aiAnalysis.personalizedSuggestions) {
    return [];
  }
  
  const userSuggestion = this.aiAnalysis.personalizedSuggestions.find(
    s => s.userId.toString() === userId.toString()
  );
  
  return userSuggestion ? userSuggestion.actionItems : [];
};

module.exports = mongoose.model('Meeting', MeetingSchema);