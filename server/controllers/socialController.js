/**
 * 社交功能控制器
 * 处理用户档案管理、简历分析、协作推荐等社交相关功能
 */

const asyncHandler = require('../utils/asyncHandler');
const UserProfile = require('../models/UserProfile');
const resumeAnalysisService = require('../services/resumeAnalysisService');
const userRecommendationService = require('../services/userRecommendationService');

/**
 * 获取用户社交档案
 * @route GET /api/social/profile
 * @access Private
 */
const getUserProfile = asyncHandler(async (req, res) => {
  let profile = await UserProfile.findOne({ user: req.user.id })
    .populate('user', 'username email profile');
  
  if (!profile) {
    // 如果档案不存在，创建默认档案
    profile = new UserProfile({
      user: req.user.id,
      profile: {
        personalInfo: {
          fullName: req.user.profile?.fullName || req.user.username,
          location: {}
        },
        skills: {
          technical: [],
          soft: [],
          languages: [],
          tools: []
        }
      },
      socialSettings: {
        isPublic: true,
        acceptCollaborations: true,
        privacy: {
          showContact: false,
          showExperience: true,
          showEducation: true,
          showFiles: false
        }
      }
    });
    
    await profile.save();
    await profile.populate('user', 'username email profile');
  }
  
  res.status(200).json({
    success: true,
    message: '获取用户档案成功',
    data: {
      profile,
      completeness: profile.completeness
    }
  });
});

/**
 * 更新用户社交档案
 * @route PUT /api/social/profile
 * @access Private
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const { profile: profileData, socialSettings, collaborationPreferences } = req.body;
  
  let profile = await UserProfile.findOne({ user: req.user.id });
  
  if (!profile) {
    profile = new UserProfile({ user: req.user.id });
  }
  
  // 更新档案信息
  if (profileData) {
    profile.profile = { ...profile.profile, ...profileData };
  }
  
  // 更新社交设置
  if (socialSettings) {
    profile.socialSettings = { ...profile.socialSettings, ...socialSettings };
  }
  
  // 更新协作偏好
  if (collaborationPreferences) {
    profile.collaborationPreferences = { ...profile.collaborationPreferences, ...collaborationPreferences };
  }
  
  await profile.save();
  await profile.populate('user', 'username email profile');
  
  res.status(200).json({
    success: true,
    message: '档案更新成功',
    data: {
      profile,
      completeness: profile.completeness
    }
  });
});

/**
 * 上传并分析简历文件
 * @route POST /api/social/resume/analyze
 * @access Private
 */
const analyzeResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请上传简历文件'
    });
  }
  
  console.log(`用户 ${req.user.id} 上传简历文件: ${req.file.originalname}`);
  
  // 分析简历
  const analysisResult = await resumeAnalysisService.analyzeResume(req.file, req.user.id);
  
  if (!analysisResult.success) {
    return res.status(500).json({
      success: false,
      message: `简历分析失败: ${analysisResult.error}`
    });
  }
  
  // 获取或创建用户档案
  let userProfile = await UserProfile.findOne({ user: req.user.id });
  if (!userProfile) {
    userProfile = new UserProfile({ user: req.user.id });
  }
  
  // 更新档案信息
  const { structuredData } = analysisResult;
  
  // 合并个人信息
  if (structuredData.personalInfo) {
    userProfile.profile.personalInfo = {
      ...userProfile.profile.personalInfo,
      ...structuredData.personalInfo,
      // 保留现有联系方式，添加新的
      contact: {
        ...userProfile.profile.contact,
        ...structuredData.personalInfo.contact
      }
    };
  }
  
  // 添加教育背景
  if (structuredData.education && structuredData.education.length > 0) {
    userProfile.profile.education = structuredData.education;
  }
  
  // 添加工作经历
  if (structuredData.workExperience && structuredData.workExperience.length > 0) {
    userProfile.profile.workExperience = structuredData.workExperience;
  }
  
  // 合并技能
  if (structuredData.skills) {
    Object.keys(structuredData.skills).forEach(skillType => {
      if (structuredData.skills[skillType] && structuredData.skills[skillType].length > 0) {
        const currentSkills = userProfile.profile.skills[skillType] || [];
        userProfile.profile.skills[skillType] = [
          ...new Set([...currentSkills, ...structuredData.skills[skillType]])
        ];
      }
    });
  }
  
  // 更新AI标签
  if (structuredData.aiTags) {
    userProfile.aiTags = {
      ...userProfile.aiTags,
      ...structuredData.aiTags,
      keywords: [
        ...new Set([...(userProfile.aiTags.keywords || []), ...(structuredData.aiTags.keywords || [])])
      ]
    };
  }
  
  // 添加文件记录
  userProfile.uploadedFiles.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    fileType: 'resume',
    extractedInfo: {
      skills: structuredData.skills?.technical || [],
      experience: structuredData.workExperience?.map(exp => exp.position) || [],
      education: structuredData.education?.map(edu => edu.degree) || [],
      achievements: []
    },
    isPublic: false // 简历文件默认不公开
  });
  
  await userProfile.save();
  
  res.status(200).json({
    success: true,
    message: '简历分析完成，档案已更新',
    data: {
      analysis: analysisResult,
      updatedProfile: userProfile,
      newTags: analysisResult.tags
    }
  });
});

/**
 * 获取协作推荐
 * @route POST /api/social/recommend
 * @access Private
 */
const getCollaborationRecommendations = asyncHandler(async (req, res) => {
  const { 
    projectTitle, 
    description, 
    skills = [], 
    experience, 
    duration,
    workType = 'remote',
    preferredLocation,
    limit = 10 
  } = req.body;
  
  if (!projectTitle && !description) {
    return res.status(400).json({
      success: false,
      message: '请提供项目标题或描述'
    });
  }
  
  console.log(`为用户 ${req.user.id} 推荐协作者`);
  
  const requirements = {
    projectTitle,
    description,
    skills,
    experience,
    duration,
    workType,
    preferredLocation,
    limit
  };
  
  const recommendations = await userRecommendationService.recommendCollaborators(
    req.user.id, 
    requirements
  );
  
  if (!recommendations.success) {
    return res.status(500).json({
      success: false,
      message: recommendations.error
    });
  }
  
  // 过滤敏感信息，只返回公开的联系方式
  const filteredRecommendations = recommendations.recommendations.map(rec => ({
    userId: rec.user._id,
    username: rec.user.username,
    profile: {
      personalInfo: {
        fullName: rec.profile.personalInfo.fullName,
        location: rec.profile.personalInfo.location,
        bio: rec.profile.bio
      },
      skills: rec.profile.skills,
      workExperience: rec.socialSettings?.privacy?.showExperience !== false 
        ? rec.profile.workExperience 
        : [],
      education: rec.socialSettings?.privacy?.showEducation !== false 
        ? rec.profile.education 
        : []
    },
    contact: rec.socialSettings?.privacy?.showContact === true 
      ? rec.profile.contact 
      : { wechatId: rec.profile.contact?.wechatId }, // 只显示微信号
    matchScore: rec.matchScore,
    matchReasons: rec.matchReasons,
    stats: {
      successfulCollaborations: rec.stats?.successfulCollaborations || 0,
      averageRating: rec.stats?.averageRating || 0
    }
  }));
  
  res.status(200).json({
    success: true,
    message: '获取推荐成功',
    data: {
      recommendations: filteredRecommendations,
      report: recommendations.report,
      totalFound: filteredRecommendations.length
    }
  });
});

/**
 * 获取公开用户列表
 * @route GET /api/social/users
 * @access Private
 */
const getPublicUsers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    skills, 
    location, 
    careerStage,
    industry 
  } = req.query;
  
  const query = {
    user: { $ne: req.user.id },
    'socialSettings.isPublic': true
  };
  
  // 技能筛选
  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim());
    query.$or = [
      { 'profile.skills.technical': { $in: skillArray } },
      { 'profile.skills.soft': { $in: skillArray } },
      { 'aiTags.keywords': { $in: skillArray } }
    ];
  }
  
  // 位置筛选
  if (location) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { 'profile.personalInfo.location.city': new RegExp(location, 'i') },
        { 'profile.personalInfo.location.province': new RegExp(location, 'i') }
      ]
    });
  }
  
  // 职业阶段筛选
  if (careerStage) {
    query['aiTags.careerStage'] = careerStage;
  }
  
  // 行业筛选
  if (industry) {
    query['aiTags.industries'] = industry;
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [users, total] = await Promise.all([
    UserProfile.find(query)
      .populate('user', 'username email')
      .select('-uploadedFiles -collaborationHistory') // 排除私密信息
      .sort({ 'stats.lastActive': -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    UserProfile.countDocuments(query)
  ]);
  
  // 过滤私密信息
  const filteredUsers = users.map(user => ({
    userId: user.user._id,
    username: user.user.username,
    profile: {
      personalInfo: {
        fullName: user.profile.personalInfo.fullName,
        location: user.profile.personalInfo.location,
        bio: user.profile.bio
      },
      skills: user.profile.skills,
      workExperience: user.socialSettings?.privacy?.showExperience !== false 
        ? user.profile.workExperience?.slice(0, 3) // 只显示前3个
        : [],
      education: user.socialSettings?.privacy?.showEducation !== false 
        ? user.profile.education?.slice(0, 2) // 只显示前2个
        : []
    },
    aiTags: {
      careerStage: user.aiTags.careerStage,
      industries: user.aiTags.industries,
      keywords: user.aiTags.keywords?.slice(0, 10) // 只显示前10个关键词
    },
    stats: {
      successfulCollaborations: user.stats?.successfulCollaborations || 0,
      averageRating: user.stats?.averageRating || 0
    },
    lastActive: user.stats?.lastActive
  }));
  
  res.status(200).json({
    success: true,
    message: '获取用户列表成功',
    data: {
      users: filteredUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

/**
 * 获取用户详细档案
 * @route GET /api/social/users/:userId
 * @access Private
 */
const getUserDetailProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const userProfile = await UserProfile.findOne({ 
    user: userId,
    'socialSettings.isPublic': true
  }).populate('user', 'username email');
  
  if (!userProfile) {
    return res.status(404).json({
      success: false,
      message: '用户档案不存在或未公开'
    });
  }
  
  // 更新档案查看次数
  await userRecommendationService.updateRecommendationStats(userId, 'view');
  
  // 返回过滤后的信息
  const profileData = {
    userId: userProfile.user._id,
    username: userProfile.user.username,
    profile: {
      personalInfo: {
        fullName: userProfile.profile.personalInfo.fullName,
        bio: userProfile.profile.bio,
        location: userProfile.profile.personalInfo.location,
        languages: userProfile.profile.personalInfo.languages
      },
      skills: userProfile.profile.skills,
      interests: userProfile.profile.interests,
      workExperience: userProfile.socialSettings?.privacy?.showExperience !== false 
        ? userProfile.profile.workExperience 
        : [],
      education: userProfile.socialSettings?.privacy?.showEducation !== false 
        ? userProfile.profile.education 
        : []
    },
    contact: userProfile.socialSettings?.privacy?.showContact === true 
      ? userProfile.profile.contact 
      : { wechatId: userProfile.profile.contact?.wechatId },
    aiTags: userProfile.aiTags,
    collaborationPreferences: userProfile.collaborationPreferences,
    stats: {
      profileViews: userProfile.stats?.profileViews || 0,
      successfulCollaborations: userProfile.stats?.successfulCollaborations || 0,
      averageRating: userProfile.stats?.averageRating || 0
    }
  };
  
  res.status(200).json({
    success: true,
    message: '获取用户档案成功',
    data: profileData
  });
});

/**
 * 发送协作请求
 * @route POST /api/social/collaboration-request
 * @access Private
 */
const sendCollaborationRequest = asyncHandler(async (req, res) => {
  const { targetUserId, projectDescription, message } = req.body;
  
  if (!targetUserId || !projectDescription) {
    return res.status(400).json({
      success: false,
      message: '请提供目标用户ID和项目描述'
    });
  }
  
  // 检查目标用户是否存在且接受协作
  const targetProfile = await UserProfile.findOne({ 
    user: targetUserId,
    'socialSettings.acceptCollaborations': true
  });
  
  if (!targetProfile) {
    return res.status(404).json({
      success: false,
      message: '目标用户不存在或不接受协作'
    });
  }
  
  // 更新协作请求统计
  await userRecommendationService.updateRecommendationStats(targetUserId, 'request');
  
  // 这里可以发送通知给目标用户
  // 简化实现，返回成功信息
  res.status(200).json({
    success: true,
    message: '协作请求已发送',
    data: {
      targetUser: targetProfile.profile.personalInfo.fullName,
      wechatContact: targetProfile.profile.contact?.wechatId || '请通过其他方式联系',
      requestSentAt: new Date()
    }
  });
});

/**
 * 获取相似用户推荐
 * @route GET /api/social/similar-users
 * @access Private
 */
const getSimilarUsers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const similarUsers = await userRecommendationService.recommendSimilarUsers(
    req.user.id, 
    parseInt(limit)
  );
  
  const filteredUsers = similarUsers.map(user => ({
    userId: user.user._id,
    username: user.user.username,
    profile: {
      personalInfo: {
        fullName: user.profile.personalInfo.fullName,
        bio: user.profile.bio,
        location: user.profile.personalInfo.location
      },
      skills: {
        technical: user.profile.skills.technical?.slice(0, 5),
        soft: user.profile.skills.soft?.slice(0, 3)
      }
    },
    aiTags: {
      industries: user.aiTags.industries,
      keywords: user.aiTags.keywords?.slice(0, 5)
    }
  }));
  
  res.status(200).json({
    success: true,
    message: '获取相似用户成功',
    data: filteredUsers
  });
});

module.exports = {
  getSocialProfile: getUserProfile,
  updateSocialProfile: updateUserProfile,
  analyzeResume,
  recommendUsers: getCollaborationRecommendations,
  searchUsers: getPublicUsers,
  getUserProfile: getUserDetailProfile,
  sendCollaborationRequest,
  findSimilarUsers: getSimilarUsers
};