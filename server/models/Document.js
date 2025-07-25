const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, '请提供文档标题'],
    trim: true,
    maxlength: [300, '文档标题不能超过300个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, '文档描述不能超过1000个字符']
  },
  
  // 文件信息
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  
  // 文档类型
  documentType: {
    type: String,
    enum: [
      'report',           // 报告
      'proposal',         // 提案
      'contract',         // 合同
      'manual',           // 手册
      'specification',    // 规格说明
      'presentation',     // 演示文稿
      'spreadsheet',      // 电子表格
      'image',           // 图片
      'other'            // 其他
    ],
    default: 'other'
  },
  
  // 上传者
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 项目关联
  project: {
    name: String,
    id: String
  },
  
  // 标签和分类
  tags: [String],
  category: String,
  
  // AI分析结果
  aiAnalysis: {
    // 文档摘要
    summary: String,
    
    // 关键词
    keywords: [String],
    
    // 重要信息提取
    keyPoints: [String],
    
    // 行动项
    actionItems: [{
      content: String,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      assignedTo: String,
      dueDate: Date
    }],
    
    // 文档结构分析
    structure: {
      sections: [{
        title: String,
        content: String,
        pageNumber: Number,
        wordCount: Number
      }],
      totalPages: Number,
      totalWords: Number
    },
    
    // 情感分析
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'negative', 'neutral']
      },
      confidence: Number // 0-1
    },
    
    // 语言检测
    language: String,
    
    // 分析时间
    analyzedAt: Date,
    
    // 分析状态
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    
    // 错误信息
    error: String
  },
  
  // 文档内容（文本提取）
  extractedText: {
    type: String,
    select: false // 默认不返回，需要显式选择
  },
  
  // 权限设置
  permissions: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedRoles: [{
      type: String,
      enum: ['user', 'admin', 'super_admin']
    }]
  },
  
  // 版本控制
  version: {
    type: Number,
    default: 1
  },
  parentDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  
  // 相关文档
  relatedDocuments: [{
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    relevanceScore: Number, // 0-1 相关度分数
    reason: String // 关联原因
  }],
  
  // 下载和查看统计
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    lastViewedAt: Date,
    lastDownloadedAt: Date
  },
  
  // 评论
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
    pageNumber: Number, // 针对特定页面的评论
    position: {
      x: Number,
      y: Number
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 状态
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // 到期时间（可选）
  expiresAt: Date,
  
  // 元数据
  metadata: {
    source: String, // 文档来源
    author: String, // 原始作者
    createdDate: Date, // 文档创建日期（非数据库记录创建时间）
    lastModified: Date, // 文档最后修改时间
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

// 虚拟字段 - 文件大小（人类可读）
DocumentSchema.virtual('readableSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// 虚拟字段 - 是否已分析
DocumentSchema.virtual('isAnalyzed').get(function() {
  return this.aiAnalysis && this.aiAnalysis.status === 'completed';
});

// 索引
DocumentSchema.index({ uploadedBy: 1 });
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ documentType: 1 });
DocumentSchema.index({ 'project.id': 1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ createdAt: -1 });
DocumentSchema.index({ 'aiAnalysis.status': 1 });

// 文本搜索索引
DocumentSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  'aiAnalysis.summary': 'text',
  'aiAnalysis.keywords': 'text'
});

// 中间件：文档删除时清理文件
DocumentSchema.pre('deleteOne', { document: true }, async function() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    if (this.path && fs.existsSync(this.path)) {
      fs.unlinkSync(this.path);
      console.log(`删除文件: ${this.path}`);
    }
  } catch (error) {
    console.error('删除文件失败:', error);
  }
});

// 静态方法：搜索文档
DocumentSchema.statics.searchDocuments = async function(query, userId = null, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1,
    documentType,
    tags,
    project
  } = options;
  
  let searchQuery = {
    status: 'active'
  };
  
  // 权限过滤
  if (userId) {
    searchQuery.$or = [
      { uploadedBy: userId },
      { 'permissions.isPublic': true },
      { 'permissions.allowedUsers': userId }
    ];
  } else {
    searchQuery['permissions.isPublic'] = true;
  }
  
  // 文本搜索
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  // 其他过滤条件
  if (documentType) {
    searchQuery.documentType = documentType;
  }
  
  if (tags && tags.length > 0) {
    searchQuery.tags = { $in: tags };
  }
  
  if (project) {
    searchQuery['project.id'] = project;
  }
  
  const skip = (page - 1) * limit;
  
  const [documents, total] = await Promise.all([
    this.find(searchQuery)
      .populate('uploadedBy', 'username profile.firstName profile.lastName')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('-extractedText'),
    this.countDocuments(searchQuery)
  ]);
  
  return {
    documents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// 实例方法：增加查看次数
DocumentSchema.methods.incrementViews = function() {
  this.statistics.views += 1;
  this.statistics.lastViewedAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// 实例方法：增加下载次数
DocumentSchema.methods.incrementDownloads = function() {
  this.statistics.downloads += 1;
  this.statistics.lastDownloadedAt = new Date();
  return this.save({ validateBeforeSave: false });
};

// 实例方法：检查用户权限
DocumentSchema.methods.hasPermission = function(userId, userRole) {
  // 上传者拥有所有权限
  if (this.uploadedBy.toString() === userId.toString()) {
    return true;
  }
  
  // 公开文档
  if (this.permissions.isPublic) {
    return true;
  }
  
  // 特定用户权限
  if (this.permissions.allowedUsers.includes(userId)) {
    return true;
  }
  
  // 角色权限
  if (this.permissions.allowedRoles.includes(userRole)) {
    return true;
  }
  
  return false;
};

module.exports = mongoose.model('Document', DocumentSchema);