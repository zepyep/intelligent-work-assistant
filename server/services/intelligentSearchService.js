/**
 * 智能搜索服务
 * 提供语义搜索、多模态搜索、智能推荐等功能
 */

const aiService = require('./aiService');
const Document = require('../models/Document');
const WebpageAnalysis = require('../models/WebpageAnalysis');
const webScrapingService = require('./webScrapingService');
const natural = require('natural');
const axios = require('axios');

class IntelligentSearchService {
  constructor() {
    this.webScraper = new webScrapingService();
    this.tfidf = new natural.TfIdf();
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    
    // 搜索历史用于个性化推荐
    this.searchHistory = new Map();
    
    // 预建索引缓存
    this.documentIndex = new Map();
    this.semanticIndex = new Map();
    
    this.initializeSearchIndex();
  }

  /**
   * 初始化搜索索引
   */
  async initializeSearchIndex() {
    try {
      console.log('🔍 初始化智能搜索索引...');
      
      // 构建文档索引
      await this.buildDocumentIndex();
      
      // 构建语义索引
      await this.buildSemanticIndex();
      
      console.log('✅ 智能搜索索引初始化完成');
    } catch (error) {
      console.error('❌ 搜索索引初始化失败:', error);
    }
  }

  /**
   * 智能搜索主入口
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @param {string} userId - 用户ID
   * @returns {Object} 搜索结果
   */
  async intelligentSearch(query, options = {}, userId = null) {
    const {
      searchType = 'hybrid', // text, semantic, hybrid
      includeWeb = false,
      includeAcademic = false,
      filterType = null,
      sortBy = 'relevance',
      maxResults = 20,
      enablePersonalization = true
    } = options;

    try {
      console.log(`🔍 执行智能搜索: "${query}", 类型: ${searchType}`);
      
      const searchResults = {
        query: query,
        searchType: searchType,
        results: {
          documents: [],
          web: [],
          academic: [],
          related: []
        },
        metadata: {
          totalResults: 0,
          searchTime: 0,
          suggestions: [],
          analytics: {}
        }
      };

      const startTime = Date.now();

      // 1. 查询预处理和增强
      const enhancedQuery = await this.enhanceQuery(query, userId);
      searchResults.enhancedQuery = enhancedQuery;

      // 2. 执行不同类型的搜索
      const searchPromises = [];

      // 文档搜索
      searchPromises.push(this.searchDocuments(enhancedQuery, options, userId));

      // 网络搜索（如果启用）
      if (includeWeb) {
        searchPromises.push(this.searchWeb(enhancedQuery.expanded, maxResults / 4));
      }

      // 学术搜索（如果启用）
      if (includeAcademic) {
        searchPromises.push(this.searchAcademic(enhancedQuery.expanded, maxResults / 4));
      }

      // 并行执行搜索
      const searchResultsArray = await Promise.allSettled(searchPromises);
      
      // 处理文档搜索结果
      if (searchResultsArray[0].status === 'fulfilled') {
        searchResults.results.documents = searchResultsArray[0].value;
      }

      // 处理网络搜索结果
      if (includeWeb && searchResultsArray[1]?.status === 'fulfilled') {
        searchResults.results.web = searchResultsArray[1].value;
      }

      // 处理学术搜索结果
      if (includeAcademic && searchResultsArray[2]?.status === 'fulfilled') {
        searchResults.results.academic = searchResultsArray[2].value;
      }

      // 3. 结果融合和重排序
      const fusedResults = await this.fuseSearchResults(searchResults.results, enhancedQuery);
      searchResults.results = fusedResults;

      // 4. 生成相关建议和推荐
      searchResults.metadata.suggestions = await this.generateSearchSuggestions(query, fusedResults);
      
      // 5. 添加相关搜索
      searchResults.results.related = await this.findRelatedContent(enhancedQuery, fusedResults);

      // 6. 个性化调整（如果启用）
      if (enablePersonalization && userId) {
        await this.personalizeResults(searchResults, userId);
        this.updateSearchHistory(userId, query, searchResults);
      }

      // 7. 搜索分析
      searchResults.metadata.totalResults = this.countTotalResults(searchResults.results);
      searchResults.metadata.searchTime = Date.now() - startTime;
      searchResults.metadata.analytics = await this.generateSearchAnalytics(query, searchResults);

      return searchResults;
    } catch (error) {
      console.error('智能搜索失败:', error);
      throw new Error(`搜索失败: ${error.message}`);
    }
  }

  /**
   * 查询增强
   * @param {string} query - 原始查询
   * @param {string} userId - 用户ID
   * @returns {Object} 增强查询
   */
  async enhanceQuery(query, userId = null) {
    try {
      const enhanced = {
        original: query,
        cleaned: this.cleanQuery(query),
        tokens: this.tokenizer.tokenize(query.toLowerCase()),
        stemmed: [],
        expanded: [],
        intent: null,
        entities: [],
        synonyms: []
      };

      // 词干提取
      enhanced.stemmed = enhanced.tokens.map(token => this.stemmer.stem(token));

      // 查询意图识别
      enhanced.intent = await this.detectQueryIntent(query);

      // 实体识别
      enhanced.entities = await this.extractQueryEntities(query);

      // 同义词扩展
      enhanced.synonyms = await this.findSynonyms(enhanced.tokens);

      // 查询扩展
      enhanced.expanded = await this.expandQuery(query, enhanced, userId);

      // 个性化调整
      if (userId && this.searchHistory.has(userId)) {
        enhanced.personalized = await this.personalizeQuery(enhanced, userId);
      }

      return enhanced;
    } catch (error) {
      console.error('查询增强失败:', error);
      return {
        original: query,
        cleaned: this.cleanQuery(query),
        tokens: this.tokenizer.tokenize(query.toLowerCase()),
        expanded: [query]
      };
    }
  }

  /**
   * 搜索文档
   * @param {Object} enhancedQuery - 增强查询
   * @param {Object} options - 搜索选项
   * @param {string} userId - 用户ID
   * @returns {Array} 文档搜索结果
   */
  async searchDocuments(enhancedQuery, options = {}, userId = null) {
    const { filterType, sortBy = 'relevance', maxResults = 10 } = options;
    
    try {
      // 1. 基于文本的搜索
      const textResults = await this.performTextSearch(enhancedQuery, options, userId);
      
      // 2. 语义搜索
      const semanticResults = await this.performSemanticSearch(enhancedQuery, options, userId);
      
      // 3. 混合搜索结果
      const hybridResults = this.combineSearchResults(textResults, semanticResults);
      
      // 4. 应用过滤器
      let filteredResults = this.applyFilters(hybridResults, { filterType, userId });
      
      // 5. 相关性评分
      filteredResults = await this.scoreRelevance(filteredResults, enhancedQuery);
      
      // 6. 排序
      filteredResults = this.sortResults(filteredResults, sortBy);
      
      // 7. 结果增强（添加摘要、高亮等）
      const enhancedResults = await this.enhanceResults(filteredResults.slice(0, maxResults), enhancedQuery);
      
      return enhancedResults;
    } catch (error) {
      console.error('文档搜索失败:', error);
      return [];
    }
  }

  /**
   * 执行文本搜索
   */
  async performTextSearch(enhancedQuery, options, userId) {
    const searchTerms = [...enhancedQuery.expanded, ...enhancedQuery.synonyms];
    
    // 构建搜索查询
    const mongoQuery = {
      $and: [
        // 权限过滤
        {
          $or: [
            { uploadedBy: userId },
            { 'permissions.isPublic': true },
            { 'permissions.allowedUsers': userId }
          ]
        },
        // 内容搜索
        {
          $or: searchTerms.flatMap(term => [
            { title: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } },
            { tags: { $regex: term, $options: 'i' } },
            { 'aiAnalysis.keywords': { $regex: term, $options: 'i' } },
            { 'aiAnalysis.summary': { $regex: term, $options: 'i' } },
            { extractedText: { $regex: term, $options: 'i' } }
          ])
        }
      ]
    };

    const documents = await Document.find(mongoQuery)
      .populate('uploadedBy', 'username profile.firstName profile.lastName')
      .select('-extractedText') // 不返回全文
      .limit(50); // 初始限制

    return documents.map(doc => ({
      type: 'document',
      id: doc._id,
      title: doc.title,
      description: doc.description,
      summary: doc.aiAnalysis?.summary || doc.description,
      keywords: doc.aiAnalysis?.keywords || [],
      author: doc.uploadedBy?.username || 'Unknown',
      createdAt: doc.createdAt,
      documentType: doc.documentType,
      relevanceScore: 0, // 将在后续步骤中计算
      highlights: [],
      metadata: {
        size: doc.size,
        mimetype: doc.mimetype,
        tags: doc.tags,
        category: doc.category
      }
    }));
  }

  /**
   * 执行语义搜索
   */
  async performSemanticSearch(enhancedQuery, options, userId) {
    try {
      // 使用AI生成查询向量
      const queryVector = await this.generateQueryVector(enhancedQuery.original);
      
      // 在语义索引中搜索相似文档
      const similarDocuments = await this.findSimilarDocuments(queryVector, {
        limit: 20,
        threshold: 0.3
      });
      
      return similarDocuments;
    } catch (error) {
      console.error('语义搜索失败:', error);
      return [];
    }
  }

  /**
   * 生成查询向量（模拟实现）
   */
  async generateQueryVector(query) {
    try {
      // 使用AI服务生成查询的语义表示
      const response = await aiService.callAI(
        `请将以下查询转换为关键概念列表，用于语义搜索: "${query}"`,
        {
          systemPrompt: '你是一个语义分析专家，请提取查询中的核心概念和相关词汇。',
          temperature: 0.1,
          maxTokens: 200
        }
      );
      
      // 将AI响应转换为向量（简化实现）
      const concepts = response.split(/[,，\n]/).map(c => c.trim()).filter(c => c);
      return this.conceptsToVector(concepts);
    } catch (error) {
      console.error('查询向量生成失败:', error);
      // 降级到基于关键词的向量
      return this.keywordsToVector(this.tokenizer.tokenize(query));
    }
  }

  /**
   * 概念转向量（简化实现）
   */
  conceptsToVector(concepts) {
    const vector = new Map();
    concepts.forEach((concept, index) => {
      vector.set(concept.toLowerCase(), 1.0 / (index + 1));
    });
    return vector;
  }

  /**
   * 查找相似文档
   */
  async findSimilarDocuments(queryVector, options = {}) {
    const { limit = 10, threshold = 0.3 } = options;
    const similarities = [];
    
    // 遍历语义索引计算相似度
    for (const [docId, docVector] of this.semanticIndex.entries()) {
      const similarity = this.calculateCosineSimilarity(queryVector, docVector);
      if (similarity >= threshold) {
        similarities.push({ docId, similarity });
      }
    }
    
    // 排序并获取文档信息
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topSimilarities = similarities.slice(0, limit);
    
    const documents = await Document.find({
      _id: { $in: topSimilarities.map(s => s.docId) }
    })
    .populate('uploadedBy', 'username')
    .select('-extractedText');
    
    return documents.map(doc => {
      const similarity = topSimilarities.find(s => s.docId.toString() === doc._id.toString());
      return {
        type: 'document',
        id: doc._id,
        title: doc.title,
        description: doc.description,
        summary: doc.aiAnalysis?.summary || doc.description,
        keywords: doc.aiAnalysis?.keywords || [],
        author: doc.uploadedBy?.username || 'Unknown',
        createdAt: doc.createdAt,
        relevanceScore: similarity?.similarity || 0,
        searchType: 'semantic',
        metadata: {
          size: doc.size,
          mimetype: doc.mimetype,
          tags: doc.tags
        }
      };
    });
  }

  /**
   * 计算余弦相似度
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    const keysA = [...vectorA.keys()];
    const keysB = [...vectorB.keys()];
    const commonKeys = keysA.filter(key => vectorB.has(key));
    
    if (commonKeys.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (const key of commonKeys) {
      const valueA = vectorA.get(key) || 0;
      const valueB = vectorB.get(key) || 0;
      dotProduct += valueA * valueB;
    }
    
    for (const value of vectorA.values()) {
      normA += value * value;
    }
    
    for (const value of vectorB.values()) {
      normB += value * value;
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 结果融合
   */
  combineSearchResults(textResults, semanticResults) {
    const combinedMap = new Map();
    
    // 添加文本搜索结果
    textResults.forEach(result => {
      combinedMap.set(result.id.toString(), {
        ...result,
        textScore: result.relevanceScore || 0.5,
        semanticScore: 0,
        searchTypes: ['text']
      });
    });
    
    // 融合语义搜索结果
    semanticResults.forEach(result => {
      const existing = combinedMap.get(result.id.toString());
      if (existing) {
        existing.semanticScore = result.relevanceScore;
        existing.searchTypes.push('semantic');
        existing.relevanceScore = (existing.textScore + result.relevanceScore) / 2;
      } else {
        combinedMap.set(result.id.toString(), {
          ...result,
          textScore: 0,
          semanticScore: result.relevanceScore,
          searchTypes: ['semantic']
        });
      }
    });
    
    return [...combinedMap.values()];
  }

  /**
   * 相关性评分
   */
  async scoreRelevance(results, enhancedQuery) {
    return results.map(result => {
      let score = result.relevanceScore || 0;
      
      // 标题匹配加分
      const titleMatches = this.countMatches(result.title, enhancedQuery.expanded);
      score += titleMatches * 0.3;
      
      // 关键词匹配加分
      const keywordMatches = this.countMatches(result.keywords?.join(' ') || '', enhancedQuery.expanded);
      score += keywordMatches * 0.2;
      
      // 实体匹配加分
      const entityMatches = this.countEntityMatches(result, enhancedQuery.entities);
      score += entityMatches * 0.25;
      
      // 时效性加分（新文档优先）
      const daysSinceCreation = (Date.now() - new Date(result.createdAt)) / (1000 * 60 * 60 * 24);
      const freshnessScore = Math.max(0, 1 - daysSinceCreation / 365); // 一年内的文档有时效加分
      score += freshnessScore * 0.1;
      
      return {
        ...result,
        relevanceScore: Math.min(1, score),
        scoringDetails: {
          titleMatches,
          keywordMatches,
          entityMatches,
          freshnessScore
        }
      };
    });
  }

  /**
   * 建立文档索引
   */
  async buildDocumentIndex() {
    try {
      const documents = await Document.find({})
        .select('title aiAnalysis.keywords aiAnalysis.summary extractedText')
        .limit(1000);
      
      documents.forEach(doc => {
        const content = [
          doc.title || '',
          doc.aiAnalysis?.summary || '',
          doc.aiAnalysis?.keywords?.join(' ') || ''
        ].join(' ');
        
        this.tfidf.addDocument(content);
        this.documentIndex.set(doc._id.toString(), {
          content,
          tokens: this.tokenizer.tokenize(content.toLowerCase())
        });
      });
      
      console.log(`📊 文档索引已建立，包含 ${documents.length} 个文档`);
    } catch (error) {
      console.error('建立文档索引失败:', error);
    }
  }

  /**
   * 建立语义索引
   */
  async buildSemanticIndex() {
    try {
      const documents = await Document.find({})
        .select('aiAnalysis.keywords')
        .limit(1000);
      
      documents.forEach(doc => {
        if (doc.aiAnalysis?.keywords?.length > 0) {
          const vector = this.keywordsToVector(doc.aiAnalysis.keywords);
          this.semanticIndex.set(doc._id.toString(), vector);
        }
      });
      
      console.log(`🧠 语义索引已建立，包含 ${this.semanticIndex.size} 个文档`);
    } catch (error) {
      console.error('建立语义索引失败:', error);
    }
  }

  /**
   * 关键词转向量
   */
  keywordsToVector(keywords) {
    const vector = new Map();
    keywords.forEach((keyword, index) => {
      vector.set(keyword.toLowerCase(), 1.0 / (index + 1));
    });
    return vector;
  }

  /**
   * 清理查询
   */
  cleanQuery(query) {
    return query
      .trim()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * 计算匹配数量
   */
  countMatches(text, terms) {
    if (!text || !terms.length) return 0;
    
    const lowerText = text.toLowerCase();
    return terms.reduce((count, term) => {
      const matches = (lowerText.match(new RegExp(term.toLowerCase(), 'g')) || []).length;
      return count + matches;
    }, 0);
  }

  /**
   * 生成搜索建议
   */
  async generateSearchSuggestions(query, results) {
    try {
      // 基于搜索结果生成相关建议
      const relatedKeywords = new Set();
      
      results.documents?.forEach(doc => {
        doc.keywords?.forEach(keyword => relatedKeywords.add(keyword));
      });
      
      const suggestions = [...relatedKeywords]
        .slice(0, 5)
        .filter(keyword => !query.toLowerCase().includes(keyword.toLowerCase()));
      
      return suggestions.map(suggestion => ({
        text: suggestion,
        type: 'related_keyword',
        reason: '基于搜索结果推荐'
      }));
    } catch (error) {
      console.error('生成搜索建议失败:', error);
      return [];
    }
  }

  /**
   * 更新搜索历史
   */
  updateSearchHistory(userId, query, results) {
    if (!this.searchHistory.has(userId)) {
      this.searchHistory.set(userId, []);
    }
    
    const userHistory = this.searchHistory.get(userId);
    userHistory.unshift({
      query,
      timestamp: new Date(),
      resultCount: results.metadata.totalResults,
      clicked: []
    });
    
    // 保持历史记录在合理范围内
    if (userHistory.length > 100) {
      userHistory.splice(100);
    }
  }

  /**
   * 统计总结果数
   */
  countTotalResults(results) {
    return (results.documents?.length || 0) + 
           (results.web?.length || 0) + 
           (results.academic?.length || 0);
  }
}

module.exports = new IntelligentSearchService();