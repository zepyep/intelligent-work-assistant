const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, '请提供任务标题'],
    trim: true,
    maxlength: [200, '任务标题不能超过200个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, '任务描述不能超过2000个字符']
  },
  
  // 任务创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 任务负责人
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 任务状态
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending'
  },
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // 任务类型
  category: {
    type: String,
    enum: ['work', 'meeting', 'personal', 'project', 'other'],
    default: 'work'
  },
  
  // 时间相关
  startDate: Date,
  dueDate: Date,
  completedAt: Date,
  estimatedHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  actualHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  
  // AI生成的任务规划方案
  aiPlans: [{
    planId: String,
    title: String,
    content: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    estimatedTime: String,
    steps: [String],
    resources: [String],
    risks: [String],
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 选中的规划方案
  selectedPlan: {
    type: String,
    ref: 'aiPlans.planId'
  },
  
  // 执行计划（为前端兼容）
  executionPlans: [{
    planName: String,
    description: String,
    estimatedTime: String,
    resources: [String],
    steps: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 标签
  tags: [String],
  
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
  
  // 子任务
  subtasks: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 进度百分比（0-100）
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // 依赖任务
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  
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
    interval: Number, // 间隔数
    endDate: Date
  },
  
  // 提醒设置
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'wechat', 'system']
    },
    time: Date,
    message: String,
    sent: {
      type: Boolean,
      default: false
    }
  }],
  
  // 评论和日志
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 活动日志
  activityLog: [{
    action: {
      type: String,
      required: true // created, updated, completed, assigned, etc.
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 元数据
  metadata: {
    createdVia: {
      type: String,
      enum: ['web', 'wechat', 'api', 'ai_generated'],
      default: 'web'
    },
    sourceType: String, // 来源类型：manual, meeting_analysis, document_analysis
    sourceId: String // 来源ID
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段 - 是否逾期
TaskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && new Date() > this.dueDate && this.status !== 'completed';
});

// 虚拟字段 - 剩余天数
TaskSchema.virtual('remainingDays').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const diff = this.dueDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// 索引
TaskSchema.index({ createdBy: 1, status: 1 });
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ priority: 1, status: 1 });
TaskSchema.index({ tags: 1 });
TaskSchema.index({ createdAt: -1 });

// 中间件：更新进度时自动计算完成状态
TaskSchema.pre('save', function(next) {
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (this.status === 'completed' && this.progress !== 100) {
    this.progress = 100;
    this.completedAt = this.completedAt || new Date();
  }
  
  next();
});

// 静态方法：获取用户的任务统计
TaskSchema.statics.getUserTaskStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { $or: [{ createdBy: userId }, { assignedTo: userId }] } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    on_hold: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// 实例方法：添加活动日志
TaskSchema.methods.addActivityLog = function(action, user, details) {
  this.activityLog.push({
    action,
    user,
    details,
    timestamp: new Date()
  });
  return this.save();
};

// 实例方法：计算子任务进度
TaskSchema.methods.calculateProgress = function() {
  if (this.subtasks.length === 0) return this.progress;
  
  const completedSubtasks = this.subtasks.filter(subtask => subtask.completed).length;
  const newProgress = Math.round((completedSubtasks / this.subtasks.length) * 100);
  
  this.progress = newProgress;
  return newProgress;
};

module.exports = mongoose.model('Task', TaskSchema);