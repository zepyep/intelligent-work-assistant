const mongoose = require('mongoose');

/**
 * 用户社交档案模型
 * 用于交友功能、协作推荐、简历分析
 */
const UserProfileSchema = new mongoose.Schema({
  // 关联用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // 基础档案信息
  profile: {
    // 个人头像
    avatar: {
      url: String,
      filename: String,
      size: Number
    },
    
    // 个人简介
    bio: {
      type: String,
      maxlength: 500
    },
    
    // 详细个人信息
    personalInfo: {
      fullName: String,
      nickname: String,
      age: Number,
      gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say']
      },
      location: {
        city: String,
        province: String,
        country: String
      },
      languages: [String], // 掌握的语言
      timezone: {
        type: String,
        default: 'Asia/Shanghai'
      }
    },
    
    // 联系方式
    contact: {
      wechatId: String,
      phoneNumber: String,
      email: String,
      linkedIn: String,
      github: String,
      website: String
    },
    
    // 教育背景
    education: [{
      institution: String, // 学校
      degree: String, // 学位
      major: String, // 专业
      startDate: Date,
      endDate: Date,
      gpa: String,
      achievements: [String] // 成就
    }],
    
    // 工作经历
    workExperience: [{
      company: String, // 公司
      position: String, // 职位
      department: String, // 部门
      startDate: Date,
      endDate: Date,
      description: String, // 工作描述
      achievements: [String], // 工作成就
      skills: [String] // 使用的技能
    }],
    
    // 技能标签 (AI自动生成 + 用户自定义)
    skills: {
      technical: [String], // 技术技能
      soft: [String], // 软技能
      languages: [String], // 编程语言
      tools: [String], // 工具和软件
      domains: [String], // 领域专长
      certifications: [String] // 认证证书
    },
    
    // 兴趣爱好
    interests: {
      professional: [String], // 专业兴趣
      personal: [String], // 个人爱好
      industries: [String] // 关注的行业
    }
  },

  // AI分析标签
  aiTags: {
    // 技能等级标签
    skillLevels: [{
      skill: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert']
      },
      confidence: Number // AI置信度 0-100
    }],
    
    // 职业发展阶段
    careerStage: {
      type: String,
      enum: ['student', 'entry_level', 'mid_level', 'senior_level', 'executive', 'entrepreneur']
    },
    
    // 工作风格标签
    workStyle: {
      collaboration: Number, // 协作能力 0-100
      leadership: Number, // 领导力 0-100
      creativity: Number, // 创新能力 0-100
      analytical: Number, // 分析能力 0-100
      communication: Number // 沟通能力 0-100
    },
    
    // 匹配关键词
    keywords: [String],
    
    // 行业分类
    industries: [String],
    
    // 角色类型
    roles: [String]
  },

  // 协作偏好
  collaborationPreferences: {
    // 愿意协作的项目类型
    projectTypes: [String],
    
    // 时间可用性
    availability: {
      timezone: String,
      workingHours: {
        start: String, // "09:00"
        end: String // "18:00"
      },
      weekdays: [String], // ["monday", "tuesday", ...]
      hoursPerWeek: Number // 可投入小时数
    },
    
    // 协作方式偏好
    workingStyle: {
      remote: Boolean, // 是否支持远程
      inPerson: Boolean, // 是否支持面对面
      flexible: Boolean // 时间是否灵活
    },
    
    // 沟通偏好
    communicationPrefs: {
      languages: [String], // 沟通语言
      channels: [String], // 偏好沟通渠道 ["wechat", "email", "video"]
      responseTime: String // 期望响应时间
    }
  },

  // 上传的文件记录
  uploadedFiles: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    fileType: {
      type: String,
      enum: ['resume', 'portfolio', 'certificate', 'recommendation', 'other']
    },
    // 该文件提取的信息
    extractedInfo: {
      skills: [String],
      experience: [String],
      education: [String],
      achievements: [String]
    },
    // 是否公开（用于推荐时是否展示）
    isPublic: {
      type: Boolean,
      default: false
    }
  }],

  // 社交设置
  socialSettings: {
    // 是否公开档案
    isPublic: {
      type: Boolean,
      default: true
    },
    
    // 是否接受协作邀请
    acceptCollaborations: {
      type: Boolean,
      default: true
    },
    
    // 隐私设置
    privacy: {
      showContact: Boolean, // 是否显示联系方式
      showExperience: Boolean, // 是否显示工作经历
      showEducation: Boolean, // 是否显示教育背景
      showFiles: Boolean // 是否显示上传文件
    },
    
    // 推荐频率限制
    recommendationLimits: {
      maxPerDay: {
        type: Number,
        default: 10
      },
      maxPerWeek: {
        type: Number,
        default: 50
      }
    }
  },

  // 协作历史
  collaborationHistory: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task' // 关联到任务系统
    },
    collaborator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startDate: Date,
    endDate: Date,
    role: String, // 在协作中的角色
    rating: Number, // 1-5星评价
    feedback: String, // 协作反馈
    skills_used: [String] // 使用的技能
  }],

  // 统计信息
  stats: {
    profileViews: {
      type: Number,
      default: 0
    },
    collaborationRequests: {
      type: Number,
      default: 0
    },
    successfulCollaborations: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },

  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
UserProfileSchema.index({ user: 1 });
UserProfileSchema.index({ 'aiTags.keywords': 1 });
UserProfileSchema.index({ 'aiTags.industries': 1 });
UserProfileSchema.index({ 'aiTags.roles': 1 });
UserProfileSchema.index({ 'profile.skills.technical': 1 });
UserProfileSchema.index({ 'socialSettings.isPublic': 1 });
UserProfileSchema.index({ createdAt: -1 });

// 虚拟字段
UserProfileSchema.virtual('completeness').get(function() {
  let score = 0;
  const fields = [
    this.profile.personalInfo.fullName,
    this.profile.bio,
    this.profile.contact.wechatId,
    this.profile.workExperience?.length > 0,
    this.profile.skills.technical?.length > 0,
    this.profile.education?.length > 0
  ];
  
  fields.forEach(field => field && score++);
  return Math.round((score / fields.length) * 100);
});

// 中间件：更新时间戳
UserProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 方法：根据技能匹配用户
UserProfileSchema.methods.findSimilarUsers = function(limit = 10) {
  const skills = this.profile.skills.technical.concat(this.profile.skills.soft);
  
  return this.constructor.find({
    user: { $ne: this.user },
    'socialSettings.isPublic': true,
    $or: [
      { 'profile.skills.technical': { $in: skills } },
      { 'profile.skills.soft': { $in: skills } },
      { 'aiTags.keywords': { $in: this.aiTags.keywords } }
    ]
  }).limit(limit);
};

// 方法：推荐协作者
UserProfileSchema.methods.recommendCollaborators = function(projectRequirements, limit = 5) {
  const requiredSkills = projectRequirements.skills || [];
  const industry = projectRequirements.industry;
  
  return this.constructor.find({
    user: { $ne: this.user },
    'socialSettings.isPublic': true,
    'socialSettings.acceptCollaborations': true,
    $and: [
      { 'profile.skills.technical': { $in: requiredSkills } },
      industry ? { 'aiTags.industries': industry } : {}
    ]
  }).limit(limit);
};

module.exports = mongoose.model('UserProfile', UserProfileSchema);