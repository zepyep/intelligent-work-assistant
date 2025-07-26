/**
 * 增强的AI调研服务
 * 提供深度文档分析、智能资料查找、多源信息整合等功能
 */

const aiService = require('./aiService');
const webScrapingService = require('./webScrapingService');
const Document = require('../models/Document');
const WebpageAnalysis = require('../models/WebpageAnalysis');
const axios = require('axios');
const natural = require('natural'); // 用于自然语言处理
const similarity = require('compute-cosine-similarity');

class EnhancedResearchService {
  constructor() {
    this.webScraping = new webScrapingService();
    
    // 初始化NLP工具
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    
    // 搜索引擎API配置
    this.searchAPIs = {
      google: {
        apiKey: process.env.GOOGLE_SEARCH_API_KEY,
        engineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
        enabled: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID)
      },
      bing: {
        apiKey: process.env.BING_SEARCH_API_KEY,
        enabled: !!process.env.BING_SEARCH_API_KEY
      }
    };
  }

  /**
   * 深度文档分析
   * @param {Object} document - 文档对象
   * @param {Object} options - 分析选项
   * @returns {Object} 分析结果
   */
  async performDeepDocumentAnalysis(document, options = {}) {
    const { 
      includeSemanticAnalysis = true, 
      includeTopicModeling = true,
      includeEntityExtraction = true,
      includeRelatedResearch = true,
      language = 'zh' 
    } = options;

    try {
      const analysisResults = {
        documentId: document._id,
        timestamp: new Date(),
        analysis: {}
      };

      // 1. 基础AI分析（摘要、关键词等）
      const basicAnalysis = await this.performEnhancedBasicAnalysis(document.extractedText, language);
      analysisResults.analysis.basic = basicAnalysis;

      // 2. 语义分析
      if (includeSemanticAnalysis) {
        const semanticAnalysis = await this.performSemanticAnalysis(document.extractedText, language);
        analysisResults.analysis.semantic = semanticAnalysis;
      }

      // 3. 主题建模
      if (includeTopicModeling) {
        const topicAnalysis = await this.performTopicModeling(document.extractedText);
        analysisResults.analysis.topics = topicAnalysis;
      }

      // 4. 实体抽取
      if (includeEntityExtraction) {
        const entities = await this.extractEntities(document.extractedText, language);
        analysisResults.analysis.entities = entities;
      }

      // 5. 相关研究发现
      if (includeRelatedResearch) {
        const relatedResearch = await this.findRelatedResearch(basicAnalysis.keywords, {
          maxResults: 10,
          includeAcademic: true,
          includeWeb: true
        });
        analysisResults.analysis.relatedResearch = relatedResearch;
      }

      // 6. 研究建议和后续方向
      const researchSuggestions = await this.generateResearchSuggestions(analysisResults.analysis);
      analysisResults.analysis.researchSuggestions = researchSuggestions;

      // 更新文档记录
      await Document.findByIdAndUpdate(document._id, {
        'aiAnalysis.enhanced': analysisResults.analysis,
        'aiAnalysis.enhancedAt': new Date(),
        'aiAnalysis.status': 'enhanced'
      });

      return analysisResults;
    } catch (error) {
      console.error('深度文档分析失败:', error);
      throw new Error(`深度分析失败: ${error.message}`);
    }
  }

  /**
   * 增强的基础分析
   */
  async performEnhancedBasicAnalysis(text, language = 'zh') {
    const systemPrompt = language === 'zh' ? 
      `你是一个专业的文档分析专家。请对提供的文档进行深入分析，提供详细的摘要、关键词、主要观点和结论。
      分析要求：
      1. 提供准确的内容摘要（200-300字）
      2. 提取5-10个核心关键词
      3. 识别3-5个主要观点
      4. 总结核心结论
      5. 评估文档的研究价值和可信度
      6. 识别潜在的研究空白和问题
      
      请用JSON格式返回结果。` : 
      `You are a professional document analysis expert. Please provide in-depth analysis of the document including summary, keywords, key points, and conclusions.`;

    const prompt = `请分析以下文档内容:\n\n${text.substring(0, 4000)}`;
    
    try {
      const aiResponse = await aiService.callAI(prompt, {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1500
      });

      // 尝试解析JSON响应
      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(aiResponse);
      } catch (e) {
        // 如果无法解析JSON，进行结构化处理
        parsedAnalysis = this.parseUnstructuredAnalysis(aiResponse);
      }

      // 添加统计信息
      const stats = this.calculateTextStatistics(text);
      
      return {
        ...parsedAnalysis,
        statistics: stats,
        language: this.detectLanguage(text),
        readabilityScore: this.calculateReadabilityScore(text),
        analysisQuality: this.assessAnalysisQuality(parsedAnalysis, text)
      };
    } catch (error) {
      console.error('基础分析失败:', error);
      // 降级到本地分析
      return this.performLocalAnalysis(text);
    }
  }

  /**
   * 语义分析
   */
  async performSemanticAnalysis(text, language = 'zh') {
    try {
      // 1. 情感分析
      const sentimentAnalysis = await this.analyzeSentiment(text, language);
      
      // 2. 语调分析
      const toneAnalysis = await this.analyzeTone(text, language);
      
      // 3. 概念关系分析
      const conceptRelations = await this.analyzeConceptRelations(text, language);
      
      // 4. 论证结构分析
      const argumentStructure = await this.analyzeArgumentStructure(text, language);

      return {
        sentiment: sentimentAnalysis,
        tone: toneAnalysis,
        conceptRelations: conceptRelations,
        argumentStructure: argumentStructure,
        semanticDensity: this.calculateSemanticDensity(text),
        complexity: this.calculateTextComplexity(text)
      };
    } catch (error) {
      console.error('语义分析失败:', error);
      return { error: error.message };
    }
  }

  /**
   * 主题建模
   */
  async performTopicModeling(text) {
    try {
      // 使用TF-IDF和聚类进行主题发现
      const sentences = this.splitIntoSentences(text);
      
      // 构建TF-IDF矩阵
      sentences.forEach(sentence => {
        this.tfidf.addDocument(sentence);
      });

      // 提取主题关键词
      const topics = [];
      const numTopics = Math.min(5, Math.ceil(sentences.length / 20));
      
      for (let i = 0; i < numTopics; i++) {
        const topWords = [];
        this.tfidf.listTerms(i).slice(0, 5).forEach(item => {
          topWords.push({
            term: item.term,
            tfidf: item.tfidf
          });
        });
        
        if (topWords.length > 0) {
          topics.push({
            id: i + 1,
            keywords: topWords,
            weight: topWords.reduce((sum, w) => sum + w.tfidf, 0),
            description: await this.generateTopicDescription(topWords.map(w => w.term))
          });
        }
      }

      return {
        topics: topics.sort((a, b) => b.weight - a.weight),
        topicCoherence: this.calculateTopicCoherence(topics),
        totalTopics: topics.length
      };
    } catch (error) {
      console.error('主题建模失败:', error);
      return { error: error.message };
    }
  }

  /**
   * 实体抽取
   */
  async extractEntities(text, language = 'zh') {
    const systemPrompt = language === 'zh' ? 
      `请从以下文本中提取所有重要的命名实体，包括：
      1. 人物（人名、组织名）
      2. 地点（地名、机构地址）
      3. 时间（日期、时期）
      4. 专业术语（技术词汇、概念）
      5. 数据（数字、统计、指标）
      
      请以JSON格式返回结果，每个实体包含类型、名称和上下文。` :
      `Please extract all important named entities from the text including persons, places, times, technical terms, and data.`;

    const prompt = `请提取以下文本中的实体:\n\n${text.substring(0, 3000)}`;
    
    try {
      const aiResponse = await aiService.callAI(prompt, {
        systemPrompt,
        temperature: 0.1,
        maxTokens: 1000
      });

      let entities;
      try {
        entities = JSON.parse(aiResponse);
      } catch (e) {
        entities = this.parseEntitiesFromText(aiResponse);
      }

      // 实体去重和验证
      const uniqueEntities = this.deduplicateEntities(entities);
      
      // 实体重要性评分
      const scoredEntities = await this.scoreEntityImportance(uniqueEntities, text);

      return {
        entities: scoredEntities,
        totalCount: scoredEntities.length,
        byType: this.groupEntitiesByType(scoredEntities),
        networkAnalysis: this.analyzeEntityRelations(scoredEntities, text)
      };
    } catch (error) {
      console.error('实体抽取失败:', error);
      return this.performLocalEntityExtraction(text);
    }
  }

  /**
   * 查找相关研究
   */
  async findRelatedResearch(keywords, options = {}) {
    const { maxResults = 10, includeAcademic = true, includeWeb = true } = options;
    
    const results = {
      academic: [],
      web: [],
      internal: [],
      summary: {}
    };

    try {
      // 1. 搜索内部文档库
      const internalResults = await this.searchInternalDocuments(keywords, maxResults);
      results.internal = internalResults;

      // 2. 网络搜索
      if (includeWeb) {
        const webResults = await this.performWebSearch(keywords, Math.ceil(maxResults / 2));
        results.web = webResults;
      }

      // 3. 学术搜索（如果配置了学术API）
      if (includeAcademic) {
        const academicResults = await this.searchAcademicSources(keywords, Math.ceil(maxResults / 2));
        results.academic = academicResults;
      }

      // 4. 结果分析和排序
      results.summary = {
        totalSources: results.internal.length + results.web.length + results.academic.length,
        relevanceDistribution: this.analyzeRelevanceDistribution([
          ...results.internal,
          ...results.web,
          ...results.academic
        ]),
        researchGaps: await this.identifyResearchGaps(keywords, results),
        recommendedNextSteps: await this.suggestNextResearchSteps(results)
      };

      return results;
    } catch (error) {
      console.error('相关研究查找失败:', error);
      return { error: error.message };
    }
  }

  /**
   * 生成研究建议
   */
  async generateResearchSuggestions(analysisResults) {
    const systemPrompt = `基于文档分析结果，请提供专业的研究建议和后续研究方向。
    建议应包括：
    1. 深入研究的重点领域
    2. 需要补充的资料和数据
    3. 潜在的研究问题和假设
    4. 推荐的研究方法
    5. 可能的协作机会
    6. 研究的实际应用价值`;

    const analysisData = JSON.stringify({
      keywords: analysisResults.basic?.keywords || [],
      topics: analysisResults.topics?.topics || [],
      entities: analysisResults.entities?.entities || [],
      researchGaps: analysisResults.relatedResearch?.summary?.researchGaps || []
    });

    try {
      const suggestions = await aiService.callAI(
        `基于以下分析结果生成研究建议:\n\n${analysisData}`,
        {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 1000
        }
      );

      return {
        suggestions: suggestions,
        priority: this.prioritizeResearchSuggestions(suggestions),
        timeline: this.estimateResearchTimeline(suggestions),
        resources: this.identifyRequiredResources(suggestions)
      };
    } catch (error) {
      console.error('研究建议生成失败:', error);
      return { error: error.message };
    }
  }

  // === 辅助方法 ===

  /**
   * 搜索内部文档库
   */
  async searchInternalDocuments(keywords, limit = 10) {
    const query = keywords.map(keyword => ({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { 'aiAnalysis.keywords': { $regex: keyword, $options: 'i' } },
        { 'aiAnalysis.summary': { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } }
      ]
    }));

    const documents = await Document.find({
      $and: query
    })
    .populate('uploadedBy', 'username')
    .select('title aiAnalysis.summary aiAnalysis.keywords createdAt uploadedBy')
    .limit(limit)
    .sort({ 'aiAnalysis.analyzedAt': -1 });

    return documents.map(doc => ({
      type: 'internal',
      title: doc.title,
      summary: doc.aiAnalysis?.summary || '',
      keywords: doc.aiAnalysis?.keywords || [],
      author: doc.uploadedBy?.username || 'Unknown',
      date: doc.createdAt,
      relevanceScore: this.calculateDocumentRelevance(doc, keywords),
      id: doc._id
    }));
  }

  /**
   * 网络搜索
   */
  async performWebSearch(keywords, limit = 5) {
    const searchQuery = keywords.join(' ');
    const results = [];

    try {
      // 使用Google Search API
      if (this.searchAPIs.google.enabled) {
        const googleResults = await this.googleSearch(searchQuery, limit);
        results.push(...googleResults);
      }

      // 使用Bing Search API
      if (this.searchAPIs.bing.enabled && results.length < limit) {
        const bingResults = await this.bingSearch(searchQuery, limit - results.length);
        results.push(...bingResults);
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('网络搜索失败:', error);
      return [];
    }
  }

  /**
   * Google搜索
   */
  async googleSearch(query, limit = 5) {
    if (!this.searchAPIs.google.enabled) return [];

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.searchAPIs.google.apiKey,
          cx: this.searchAPIs.google.engineId,
          q: query,
          num: limit
        }
      });

      return response.data.items?.map(item => ({
        type: 'web',
        title: item.title,
        url: item.link,
        summary: item.snippet,
        source: 'Google',
        relevanceScore: 0.8 // 默认相关度
      })) || [];
    } catch (error) {
      console.error('Google搜索失败:', error);
      return [];
    }
  }

  /**
   * 计算文本统计信息
   */
  calculateTextStatistics(text) {
    const words = this.tokenizer.tokenize(text) || [];
    const sentences = this.splitIntoSentences(text);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      avgWordsPerSentence: words.length / sentences.length,
      avgSentencesPerParagraph: sentences.length / paragraphs.length,
      uniqueWords: [...new Set(words.map(w => w.toLowerCase()))].length,
      lexicalDiversity: [...new Set(words.map(w => w.toLowerCase()))].length / words.length
    };
  }

  /**
   * 计算可读性分数
   */
  calculateReadabilityScore(text) {
    // 简化的可读性评估
    const words = this.tokenizer.tokenize(text) || [];
    const sentences = this.splitIntoSentences(text);
    
    const avgWordsPerSentence = words.length / sentences.length;
    const complexWords = words.filter(word => word.length > 6).length;
    const complexWordRatio = complexWords / words.length;
    
    // 简化的Flesch公式
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * complexWordRatio);
    
    return {
      score: Math.max(0, Math.min(100, score)),
      level: this.getReadabilityLevel(score),
      avgWordsPerSentence,
      complexWordRatio
    };
  }

  /**
   * 分割句子
   */
  splitIntoSentences(text) {
    return text.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
  }

  /**
   * 语言检测
   */
  detectLanguage(text) {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    
    if (chineseChars / totalChars > 0.3) {
      return { code: 'zh', name: '中文', confidence: chineseChars / totalChars };
    } else {
      return { code: 'en', name: 'English', confidence: 1 - (chineseChars / totalChars) };
    }
  }

  /**
   * 计算文档相关性
   */
  calculateDocumentRelevance(document, keywords) {
    const text = (document.title + ' ' + (document.aiAnalysis?.summary || '')).toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 0.2;
      }
    });

    return Math.min(1, score);
  }

  /**
   * 本地实体抽取（降级方案）
   */
  performLocalEntityExtraction(text) {
    const entities = [];
    
    // 简单的正则表达式模式
    const patterns = {
      person: /([A-Z][a-z]+\s[A-Z][a-z]+|[\u4e00-\u9fa5]{2,4})/g,
      date: /(\d{4}[年\-\/]\d{1,2}[月\-\/]\d{1,2}[日]?|\d{1,2}[月\-\/]\d{1,2}[日\-\/]\d{4})/g,
      number: /(\d+(?:\.\d+)?[万亿千百十%‰]?)/g
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        entities.push({
          type,
          name: match.trim(),
          confidence: 0.6
        });
      });
    });

    return {
      entities: entities.slice(0, 20),
      totalCount: entities.length,
      note: 'Local extraction used (AI service unavailable)'
    };
  }
}

module.exports = new EnhancedResearchService();