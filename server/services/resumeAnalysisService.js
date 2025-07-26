/**
 * 简历分析服务
 * 使用AI分析用户上传的简历文件，自动提取信息并生成标签
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const aiService = require('./aiService');

class ResumeAnalysisService {
  /**
   * 分析简历文件
   * @param {Object} file 上传的文件对象
   * @param {String} userId 用户ID
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeResume(file, userId) {
    try {
      console.log(`开始分析用户 ${userId} 的简历文件: ${file.originalname}`);
      
      // 1. 提取文件文本内容
      const textContent = await this.extractTextFromFile(file);
      
      // 2. AI分析文本内容
      const analysisResult = await this.performAIAnalysis(textContent);
      
      // 3. 生成标签和分类
      const tags = await this.generateTags(analysisResult);
      
      // 4. 构建结构化数据
      const structuredData = this.structureAnalysisData(analysisResult, tags);
      
      console.log(`简历分析完成，提取到 ${tags.length} 个标签`);
      
      return {
        success: true,
        textContent,
        analysis: analysisResult,
        tags,
        structuredData,
        confidence: this.calculateConfidence(analysisResult),
        extractedAt: new Date()
      };
    } catch (error) {
      console.error('简历分析失败:', error);
      return {
        success: false,
        error: error.message,
        extractedAt: new Date()
      };
    }
  }

  /**
   * 从文件中提取文本内容
   * @param {Object} file 文件对象
   * @returns {Promise<String>} 提取的文本
   */
  async extractTextFromFile(file) {
    const filePath = file.path;
    const mimetype = file.mimetype;
    
    try {
      switch (mimetype) {
        case 'application/pdf':
          return await this.extractFromPDF(filePath);
          
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromWord(filePath);
          
        case 'text/plain':
        case 'text/markdown':
          return await this.extractFromText(filePath);
          
        default:
          throw new Error(`不支持的文件类型: ${mimetype}`);
      }
    } catch (error) {
      throw new Error(`文件解析失败: ${error.message}`);
    }
  }

  /**
   * 从PDF文件提取文本
   */
  async extractFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  /**
   * 从Word文件提取文本
   */
  async extractFromWord(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  /**
   * 从文本文件提取内容
   */
  async extractFromText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * 执行AI分析
   * @param {String} textContent 文本内容
   * @returns {Promise<Object>} AI分析结果
   */
  async performAIAnalysis(textContent) {
    const systemPrompt = `你是一个专业的HR和简历分析专家。请分析以下简历内容，提取关键信息并进行结构化输出。

请按照以下JSON格式返回分析结果：
{
  "personalInfo": {
    "name": "姓名",
    "age": "年龄（如果提及）",
    "location": "地址",
    "contact": {
      "email": "邮箱",
      "phone": "电话",
      "wechat": "微信号（如果有）"
    }
  },
  "education": [
    {
      "institution": "学校名称",
      "degree": "学位",
      "major": "专业",
      "duration": "时间段",
      "achievements": ["成就列表"]
    }
  ],
  "workExperience": [
    {
      "company": "公司名称",
      "position": "职位",
      "duration": "工作时间",
      "responsibilities": ["工作职责"],
      "achievements": ["工作成就"]
    }
  ],
  "skills": {
    "technical": ["技术技能"],
    "soft": ["软技能"],
    "languages": ["编程语言"],
    "tools": ["工具和软件"],
    "certifications": ["认证证书"]
  },
  "summary": {
    "careerLevel": "职业阶段",
    "industries": ["相关行业"],
    "specialties": ["专长领域"],
    "yearsOfExperience": "工作年限"
  }
}`;

    try {
      const response = await aiService.callAI(textContent, {
        systemPrompt,
        provider: 'ppio',
        temperature: 0.3,
        maxTokens: 2000
      });

      // 尝试解析JSON响应
      try {
        return JSON.parse(response);
      } catch (parseError) {
        console.warn('AI响应不是有效JSON，使用文本解析');
        return this.parseTextResponse(response);
      }
    } catch (error) {
      console.warn('AI分析失败，使用基础解析', error.message);
      return this.basicTextAnalysis(textContent);
    }
  }

  /**
   * 生成标签
   * @param {Object} analysisResult 分析结果
   * @returns {Promise<Array>} 标签数组
   */
  async generateTags(analysisResult) {
    const tags = [];
    
    // 技能标签
    if (analysisResult.skills) {
      tags.push(...(analysisResult.skills.technical || []));
      tags.push(...(analysisResult.skills.soft || []));
      tags.push(...(analysisResult.skills.languages || []));
      tags.push(...(analysisResult.skills.tools || []));
    }
    
    // 行业标签
    if (analysisResult.summary?.industries) {
      tags.push(...analysisResult.summary.industries);
    }
    
    // 专长标签
    if (analysisResult.summary?.specialties) {
      tags.push(...analysisResult.summary.specialties);
    }
    
    // 职位标签
    if (analysisResult.workExperience) {
      analysisResult.workExperience.forEach(job => {
        if (job.position) tags.push(job.position);
      });
    }
    
    // 去重并过滤
    const uniqueTags = [...new Set(tags)]
      .filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim().toLowerCase());
    
    return uniqueTags;
  }

  /**
   * 结构化分析数据
   * @param {Object} analysisResult AI分析结果
   * @param {Array} tags 标签数组
   * @returns {Object} 结构化数据
   */
  structureAnalysisData(analysisResult, tags) {
    return {
      // 个人信息
      personalInfo: analysisResult.personalInfo || {},
      
      // 教育背景
      education: (analysisResult.education || []).map(edu => ({
        institution: edu.institution || '',
        degree: edu.degree || '',
        major: edu.major || '',
        duration: edu.duration || '',
        achievements: edu.achievements || []
      })),
      
      // 工作经历
      workExperience: (analysisResult.workExperience || []).map(work => ({
        company: work.company || '',
        position: work.position || '',
        duration: work.duration || '',
        responsibilities: work.responsibilities || [],
        achievements: work.achievements || []
      })),
      
      // 技能分类
      skills: {
        technical: analysisResult.skills?.technical || [],
        soft: analysisResult.skills?.soft || [],
        languages: analysisResult.skills?.languages || [],
        tools: analysisResult.skills?.tools || [],
        certifications: analysisResult.skills?.certifications || []
      },
      
      // AI生成的标签
      aiTags: {
        keywords: tags,
        careerStage: this.inferCareerStage(analysisResult),
        industries: analysisResult.summary?.industries || [],
        specialties: analysisResult.summary?.specialties || [],
        skillLevels: this.inferSkillLevels(analysisResult.skills || {}),
        workStyle: this.inferWorkStyle(analysisResult)
      }
    };
  }

  /**
   * 推断职业阶段
   */
  inferCareerStage(analysisResult) {
    const experience = analysisResult.summary?.yearsOfExperience || 0;
    const workHistory = analysisResult.workExperience || [];
    
    if (experience === 0 && workHistory.length === 0) return 'student';
    if (experience <= 2) return 'entry_level';
    if (experience <= 5) return 'mid_level';
    if (experience <= 10) return 'senior_level';
    return 'executive';
  }

  /**
   * 推断技能等级
   */
  inferSkillLevels(skills) {
    const allSkills = [
      ...(skills.technical || []),
      ...(skills.languages || []),
      ...(skills.tools || [])
    ];
    
    return allSkills.map(skill => ({
      skill: skill,
      level: 'intermediate', // 默认中等水平
      confidence: 75
    }));
  }

  /**
   * 推断工作风格
   */
  inferWorkStyle(analysisResult) {
    // 基于简历内容推断工作风格特征
    const responsibilities = analysisResult.workExperience?.flatMap(job => job.responsibilities || []) || [];
    const achievements = analysisResult.workExperience?.flatMap(job => job.achievements || []) || [];
    const allText = responsibilities.concat(achievements).join(' ').toLowerCase();
    
    return {
      leadership: this.scoreAttribute(allText, ['lead', 'manage', 'team', 'supervise', '领导', '管理']),
      collaboration: this.scoreAttribute(allText, ['collaborate', 'team', 'work with', '协作', '团队']),
      creativity: this.scoreAttribute(allText, ['design', 'create', 'innovate', '创新', '设计']),
      analytical: this.scoreAttribute(allText, ['analyze', 'data', 'research', '分析', '数据']),
      communication: this.scoreAttribute(allText, ['present', 'communicate', 'write', '沟通', '演示'])
    };
  }

  /**
   * 属性评分
   */
  scoreAttribute(text, keywords) {
    let score = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) score += 20;
    });
    return Math.min(score, 100);
  }

  /**
   * 计算分析置信度
   */
  calculateConfidence(analysisResult) {
    let confidence = 0;
    let factors = 0;
    
    // 个人信息完整度
    if (analysisResult.personalInfo?.name) {
      confidence += 20;
      factors++;
    }
    
    // 工作经历完整度
    if (analysisResult.workExperience?.length > 0) {
      confidence += 30;
      factors++;
    }
    
    // 技能信息完整度
    if (analysisResult.skills?.technical?.length > 0) {
      confidence += 25;
      factors++;
    }
    
    // 教育背景完整度
    if (analysisResult.education?.length > 0) {
      confidence += 15;
      factors++;
    }
    
    // 联系方式完整度
    if (analysisResult.personalInfo?.contact?.email) {
      confidence += 10;
      factors++;
    }
    
    return factors > 0 ? Math.round(confidence / factors * factors) : 0;
  }

  /**
   * 基础文本分析（AI失败时的后备方案）
   */
  basicTextAnalysis(textContent) {
    const lines = textContent.split('\n').filter(line => line.trim());
    
    // 简单的关键词提取
    const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/g;
    const phonePattern = /[\d\s\-\(\)]{10,}/g;
    
    const emails = textContent.match(emailPattern) || [];
    const phones = textContent.match(phonePattern) || [];
    
    return {
      personalInfo: {
        name: lines[0] || '',
        contact: {
          email: emails[0] || '',
          phone: phones[0] || ''
        }
      },
      workExperience: [],
      education: [],
      skills: {
        technical: [],
        soft: [],
        languages: [],
        tools: []
      },
      summary: {
        careerLevel: 'unknown',
        industries: [],
        specialties: []
      }
    };
  }

  /**
   * 解析文本响应（非JSON格式）
   */
  parseTextResponse(response) {
    // 简单的文本解析逻辑
    return {
      personalInfo: { name: '', contact: {} },
      workExperience: [],
      education: [],
      skills: { technical: [], soft: [], languages: [], tools: [] },
      summary: { careerLevel: 'unknown', industries: [], specialties: [] }
    };
  }

  /**
   * 批量分析简历
   * @param {Array} files 文件数组
   * @param {String} userId 用户ID
   * @returns {Promise<Array>} 批量分析结果
   */
  async batchAnalyzeResumes(files, userId) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.analyzeResume(file, userId);
        results.push({
          filename: file.originalname,
          result
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new ResumeAnalysisService();