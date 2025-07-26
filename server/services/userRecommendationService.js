/**
 * 用户推荐服务
 * 基于用户档案、技能标签、工作需求进行智能人员推荐
 */

const UserProfile = require('../models/UserProfile');
const aiService = require('./aiService');

class UserRecommendationService {
  /**
   * 根据协作需求推荐用户
   * @param {String} requesterId 发起推荐请求的用户ID
   * @param {Object} requirements 协作需求
   * @returns {Promise<Array>} 推荐的用户列表
   */
  async recommendCollaborators(requesterId, requirements) {
    try {
      console.log(`为用户 ${requesterId} 推荐协作者`);
      
      // 1. 获取请求用户的档案
      const requesterProfile = await UserProfile.findOne({ user: requesterId });
      if (!requesterProfile) {
        throw new Error('用户档案不存在');
      }
      
      // 2. 解析协作需求
      const parsedRequirements = await this.parseCollaborationRequirements(requirements);
      
      // 3. 基于技能匹配查找候选用户
      const candidates = await this.findCandidateUsers(requesterId, parsedRequirements);
      
      // 4. 计算匹配度并排序
      const scoredCandidates = candidates.map(candidate => ({
        ...candidate.toObject(),
        matchScore: this.calculateMatchScore(candidate, parsedRequirements, requesterProfile),
        matchReasons: this.generateMatchReasons(candidate, parsedRequirements)
      }));
      
      // 5. 按匹配度排序并返回前N个
      const sortedCandidates = scoredCandidates
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, requirements.limit || 10);
      
      // 6. 生成推荐报告
      const report = this.generateRecommendationReport(sortedCandidates, parsedRequirements);
      
      console.log(`推荐完成，找到 ${sortedCandidates.length} 个候选人`);
      
      return {
        success: true,
        recommendations: sortedCandidates,
        report,
        requesterId,
        requirements: parsedRequirements,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('用户推荐失败:', error);
      return {
        success: false,
        error: error.message,
        requesterId,
        generatedAt: new Date()
      };
    }
  }

  /**
   * 解析协作需求
   * @param {Object} requirements 原始需求
   * @returns {Promise<Object>} 解析后的需求
   */
  async parseCollaborationRequirements(requirements) {
    const {
      projectTitle = '',
      description = '',
      skills = [],
      experience = '',
      duration = '',
      workType = 'remote',
      budget = '',
      timeline = '',
      preferredLocation = ''
    } = requirements;
    
    // 如果有描述文本，使用AI解析更多信息
    if (description) {
      try {
        const aiAnalysis = await this.aiParseRequirements(description);
        return {
          projectTitle,
          description,
          skills: [...new Set([...skills, ...(aiAnalysis.skills || [])])],
          experience,
          duration,
          workType,
          budget,
          timeline,
          preferredLocation,
          // AI解析的额外信息
          aiExtracted: {
            industries: aiAnalysis.industries || [],
            complexity: aiAnalysis.complexity || 'medium',
            teamSize: aiAnalysis.teamSize || 'small',
            urgency: aiAnalysis.urgency || 'normal'
          }
        };
      } catch (error) {
        console.warn('AI解析需求失败，使用原始需求', error.message);
      }
    }
    
    return {
      projectTitle,
      description,
      skills,
      experience,
      duration,
      workType,
      budget,
      timeline,
      preferredLocation,
      aiExtracted: {}
    };
  }

  /**
   * AI解析协作需求描述
   */
  async aiParseRequirements(description) {
    const systemPrompt = `分析以下项目需求描述，提取关键信息并以JSON格式返回：

{
  "skills": ["所需技能列表"],
  "industries": ["相关行业"],
  "complexity": "项目复杂度(low/medium/high)",
  "teamSize": "团队规模(small/medium/large)",
  "urgency": "紧急程度(low/normal/high)",
  "roles": ["需要的角色类型"]
}`;

    try {
      const response = await aiService.callAI(description, {
        systemPrompt,
        provider: 'ppio',
        temperature: 0.3,
        maxTokens: 500
      });
      
      return JSON.parse(response);
    } catch (error) {
      console.warn('AI解析需求失败:', error.message);
      return {};
    }
  }

  /**
   * 查找候选用户
   * @param {String} requesterId 请求用户ID
   * @param {Object} requirements 解析后的需求
   * @returns {Promise<Array>} 候选用户列表
   */
  async findCandidateUsers(requesterId, requirements) {
    const query = {
      user: { $ne: requesterId }, // 排除自己
      'socialSettings.isPublic': true,
      'socialSettings.acceptCollaborations': true
    };
    
    // 基于技能筛选
    if (requirements.skills && requirements.skills.length > 0) {
      query.$or = [
        { 'profile.skills.technical': { $in: requirements.skills } },
        { 'profile.skills.soft': { $in: requirements.skills } },
        { 'aiTags.keywords': { $in: requirements.skills } }
      ];
    }
    
    // 基于行业筛选
    if (requirements.aiExtracted?.industries?.length > 0) {
      if (!query.$and) query.$and = [];
      query.$and.push({
        'aiTags.industries': { $in: requirements.aiExtracted.industries }
      });
    }
    
    // 基于位置筛选
    if (requirements.preferredLocation) {
      if (!query.$and) query.$and = [];
      query.$and.push({
        $or: [
          { 'profile.personalInfo.location.city': requirements.preferredLocation },
          { 'profile.personalInfo.location.province': requirements.preferredLocation }
        ]
      });
    }
    
    return await UserProfile.find(query)
      .populate('user', 'username email')
      .limit(50); // 最多返回50个候选人
  }

  /**
   * 计算匹配度分数
   * @param {Object} candidate 候选人档案
   * @param {Object} requirements 需求
   * @param {Object} requesterProfile 请求人档案
   * @returns {Number} 匹配度分数 (0-100)
   */
  calculateMatchScore(candidate, requirements, requesterProfile) {
    let score = 0;
    let maxScore = 0;
    
    // 1. 技能匹配 (权重: 40%)
    const skillScore = this.calculateSkillMatch(candidate, requirements.skills);
    score += skillScore * 0.4;
    maxScore += 40;
    
    // 2. 经验匹配 (权重: 25%)
    const experienceScore = this.calculateExperienceMatch(candidate, requirements);
    score += experienceScore * 0.25;
    maxScore += 25;
    
    // 3. 可用性匹配 (权重: 15%)
    const availabilityScore = this.calculateAvailabilityMatch(candidate, requirements);
    score += availabilityScore * 0.15;
    maxScore += 15;
    
    // 4. 位置匹配 (权重: 10%)
    const locationScore = this.calculateLocationMatch(candidate, requirements);
    score += locationScore * 0.1;
    maxScore += 10;
    
    // 5. 协作历史 (权重: 10%)
    const collaborationScore = this.calculateCollaborationHistory(candidate);
    score += collaborationScore * 0.1;
    maxScore += 10;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * 计算技能匹配度
   */
  calculateSkillMatch(candidate, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 50;
    
    const candidateSkills = [
      ...(candidate.profile.skills.technical || []),
      ...(candidate.profile.skills.soft || []),
      ...(candidate.aiTags.keywords || [])
    ].map(skill => skill.toLowerCase());
    
    const matchedSkills = requiredSkills.filter(skill => 
      candidateSkills.includes(skill.toLowerCase())
    );
    
    return (matchedSkills.length / requiredSkills.length) * 100;
  }

  /**
   * 计算经验匹配度
   */
  calculateExperienceMatch(candidate, requirements) {
    const careerStage = candidate.aiTags.careerStage;
    const workExperience = candidate.profile.workExperience?.length || 0;
    
    // 基于职业阶段评分
    const stageScores = {
      'student': 20,
      'entry_level': 40,
      'mid_level': 70,
      'senior_level': 90,
      'executive': 100
    };
    
    let score = stageScores[careerStage] || 50;
    
    // 工作经历数量加分
    score += Math.min(workExperience * 5, 20);
    
    return Math.min(score, 100);
  }

  /**
   * 计算可用性匹配度
   */
  calculateAvailabilityMatch(candidate, requirements) {
    const prefs = candidate.collaborationPreferences;
    if (!prefs || !prefs.availability) return 50;
    
    let score = 70; // 基础分
    
    // 工作时间匹配
    if (prefs.availability.hoursPerWeek) {
      const hours = parseInt(prefs.availability.hoursPerWeek);
      if (hours >= 20) score += 20;
      else if (hours >= 10) score += 10;
    }
    
    // 工作方式匹配
    if (requirements.workType === 'remote' && prefs.workingStyle?.remote) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  /**
   * 计算位置匹配度
   */
  calculateLocationMatch(candidate, requirements) {
    if (!requirements.preferredLocation) return 70; // 无位置要求时给中等分
    
    const candidateLocation = candidate.profile.personalInfo?.location;
    if (!candidateLocation) return 30;
    
    const required = requirements.preferredLocation.toLowerCase();
    const city = candidateLocation.city?.toLowerCase() || '';
    const province = candidateLocation.province?.toLowerCase() || '';
    
    if (city.includes(required) || required.includes(city)) return 100;
    if (province.includes(required) || required.includes(province)) return 70;
    
    return 20; // 不匹配但可以远程工作
  }

  /**
   * 计算协作历史评分
   */
  calculateCollaborationHistory(candidate) {
    const history = candidate.collaborationHistory || [];
    const stats = candidate.stats || {};
    
    let score = 50; // 基础分
    
    // 成功协作次数加分
    const successfulCollabs = stats.successfulCollaborations || 0;
    score += Math.min(successfulCollabs * 10, 30);
    
    // 平均评分加分
    const avgRating = stats.averageRating || 0;
    if (avgRating >= 4.5) score += 20;
    else if (avgRating >= 4.0) score += 15;
    else if (avgRating >= 3.5) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * 生成匹配原因
   * @param {Object} candidate 候选人
   * @param {Object} requirements 需求
   * @returns {Array} 匹配原因列表
   */
  generateMatchReasons(candidate, requirements) {
    const reasons = [];
    
    // 技能匹配原因
    const matchedSkills = this.findMatchedSkills(candidate, requirements.skills);
    if (matchedSkills.length > 0) {
      reasons.push({
        type: 'skills',
        message: `掌握所需技能: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? ' 等' : ''}`,
        importance: 'high'
      });
    }
    
    // 经验匹配原因
    const careerStage = candidate.aiTags.careerStage;
    if (careerStage) {
      const stageNames = {
        'entry_level': '入门级',
        'mid_level': '中级',
        'senior_level': '高级',
        'executive': '专家级'
      };
      reasons.push({
        type: 'experience',
        message: `${stageNames[careerStage] || careerStage}经验水平`,
        importance: 'medium'
      });
    }
    
    // 行业匹配原因
    const industries = candidate.aiTags.industries || [];
    const reqIndustries = requirements.aiExtracted?.industries || [];
    const matchedIndustries = industries.filter(ind => reqIndustries.includes(ind));
    if (matchedIndustries.length > 0) {
      reasons.push({
        type: 'industry',
        message: `相关行业经验: ${matchedIndustries.join(', ')}`,
        importance: 'medium'
      });
    }
    
    // 协作历史原因
    const successfulCollabs = candidate.stats?.successfulCollaborations || 0;
    if (successfulCollabs > 0) {
      reasons.push({
        type: 'history',
        message: `${successfulCollabs}次成功协作经历`,
        importance: 'low'
      });
    }
    
    return reasons;
  }

  /**
   * 查找匹配的技能
   */
  findMatchedSkills(candidate, requiredSkills) {
    if (!requiredSkills) return [];
    
    const candidateSkills = [
      ...(candidate.profile.skills.technical || []),
      ...(candidate.profile.skills.soft || []),
      ...(candidate.aiTags.keywords || [])
    ].map(skill => skill.toLowerCase());
    
    return requiredSkills.filter(skill => 
      candidateSkills.includes(skill.toLowerCase())
    );
  }

  /**
   * 生成推荐报告
   * @param {Array} recommendations 推荐结果
   * @param {Object} requirements 需求
   * @returns {Object} 推荐报告
   */
  generateRecommendationReport(recommendations, requirements) {
    const totalCandidates = recommendations.length;
    const avgScore = totalCandidates > 0 
      ? recommendations.reduce((sum, rec) => sum + rec.matchScore, 0) / totalCandidates 
      : 0;
    
    // 技能覆盖分析
    const skillCoverage = this.analyzeSkillCoverage(recommendations, requirements.skills);
    
    // 经验分布分析
    const experienceDistribution = this.analyzeExperienceDistribution(recommendations);
    
    return {
      summary: {
        totalCandidates,
        averageMatchScore: Math.round(avgScore),
        highQualityMatches: recommendations.filter(rec => rec.matchScore >= 80).length,
        skillCoverage,
        experienceDistribution
      },
      insights: this.generateInsights(recommendations, requirements),
      generatedAt: new Date()
    };
  }

  /**
   * 分析技能覆盖情况
   */
  analyzeSkillCoverage(recommendations, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return {};
    
    const coverage = {};
    requiredSkills.forEach(skill => {
      const matchingCandidates = recommendations.filter(rec => 
        this.findMatchedSkills(rec, [skill]).length > 0
      );
      coverage[skill] = {
        candidates: matchingCandidates.length,
        percentage: Math.round((matchingCandidates.length / recommendations.length) * 100)
      };
    });
    
    return coverage;
  }

  /**
   * 分析经验分布
   */
  analyzeExperienceDistribution(recommendations) {
    const distribution = {};
    recommendations.forEach(rec => {
      const stage = rec.aiTags.careerStage || 'unknown';
      distribution[stage] = (distribution[stage] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * 生成洞察建议
   */
  generateInsights(recommendations, requirements) {
    const insights = [];
    
    if (recommendations.length === 0) {
      insights.push({
        type: 'warning',
        message: '未找到合适的候选人，建议放宽搜索条件或扩大技能范围'
      });
    } else if (recommendations.length < 3) {
      insights.push({
        type: 'suggestion',
        message: '候选人数量较少，建议考虑扩大搜索范围或降低部分要求'
      });
    }
    
    const highScoreCandidates = recommendations.filter(rec => rec.matchScore >= 90).length;
    if (highScoreCandidates > 0) {
      insights.push({
        type: 'highlight',
        message: `发现${highScoreCandidates}个高度匹配的候选人，建议优先联系`
      });
    }
    
    return insights;
  }

  /**
   * 根据用户标签推荐相似用户
   * @param {String} userId 用户ID
   * @param {Number} limit 推荐数量限制
   * @returns {Promise<Array>} 相似用户列表
   */
  async recommendSimilarUsers(userId, limit = 10) {
    try {
      const userProfile = await UserProfile.findOne({ user: userId });
      if (!userProfile) {
        throw new Error('用户档案不存在');
      }
      
      return await userProfile.findSimilarUsers(limit);
    } catch (error) {
      console.error('推荐相似用户失败:', error);
      return [];
    }
  }

  /**
   * 更新推荐统计信息
   * @param {String} userId 被推荐用户ID
   * @param {String} action 操作类型
   */
  async updateRecommendationStats(userId, action) {
    try {
      const updateData = {};
      
      switch (action) {
        case 'view':
          updateData['$inc'] = { 'stats.profileViews': 1 };
          break;
        case 'request':
          updateData['$inc'] = { 'stats.collaborationRequests': 1 };
          break;
        case 'accept':
          updateData['$inc'] = { 'stats.successfulCollaborations': 1 };
          break;
      }
      
      if (Object.keys(updateData).length > 0) {
        await UserProfile.updateOne({ user: userId }, updateData);
      }
    } catch (error) {
      console.error('更新推荐统计失败:', error);
    }
  }
}

module.exports = new UserRecommendationService();