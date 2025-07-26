/**
 * 增强AI功能控制器
 * 提供深度分析、智能搜索、研究建议等高级功能
 */

const asyncHandler = require('../utils/asyncHandler');
const enhancedResearchService = require('../services/enhancedResearchService');
const intelligentSearchService = require('../services/intelligentSearchService');
const Document = require('../models/Document');
const WebpageAnalysis = require('../models/WebpageAnalysis');
const aiService = require('../services/aiService');

/**
 * 深度文档分析
 * @route   POST /api/ai/enhanced/analyze/:documentId
 * @access  Private
 */
const performDeepAnalysis = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const {
    includeSemanticAnalysis = true,
    includeTopicModeling = true,
    includeEntityExtraction = true,
    includeRelatedResearch = true,
    language = 'zh'
  } = req.body;

  const document = await Document.findById(documentId);
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档未找到'
    });
  }

  // 检查权限
  if (document.uploadedBy.toString() !== req.user.id && 
      !document.permissions?.allowedUsers?.includes(req.user.id) &&
      !document.permissions?.isPublic) {
    return res.status(403).json({
      success: false,
      message: '无权限访问此文档'
    });
  }

  try {
    console.log(`🔍 开始深度分析文档: ${document.title}`);
    
    const analysisResult = await enhancedResearchService.performDeepDocumentAnalysis(document, {
      includeSemanticAnalysis,
      includeTopicModeling,
      includeEntityExtraction,
      includeRelatedResearch,
      language
    });

    res.status(200).json({
      success: true,
      message: '深度分析完成',
      data: {
        analysisId: analysisResult.documentId,
        timestamp: analysisResult.timestamp,
        analysis: analysisResult.analysis,
        processingTime: Date.now() - new Date(analysisResult.timestamp).getTime()
      }
    });

  } catch (error) {
    console.error('深度分析失败:', error);
    res.status(500).json({
      success: false,
      message: '深度分析失败',
      error: error.message
    });
  }
});

/**
 * 智能搜索
 * @route   POST /api/ai/enhanced/search
 * @access  Private
 */
const intelligentSearch = asyncHandler(async (req, res) => {
  const {
    query,
    searchType = 'hybrid',
    includeWeb = false,
    includeAcademic = false,
    filterType = null,
    sortBy = 'relevance',
    maxResults = 20,
    enablePersonalization = true
  } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '搜索查询不能为空'
    });
  }

  try {
    console.log(`🔍 执行智能搜索: "${query}"`);
    
    const searchResults = await intelligentSearchService.intelligentSearch(
      query, 
      {
        searchType,
        includeWeb,
        includeAcademic,
        filterType,
        sortBy,
        maxResults,
        enablePersonalization
      },
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: '智能搜索完成',
      data: searchResults
    });

  } catch (error) {
    console.error('智能搜索失败:', error);
    res.status(500).json({
      success: false,
      message: '智能搜索失败',
      error: error.message
    });
  }
});

/**
 * 研究主题发现
 * @route   POST /api/ai/enhanced/discover-topics
 * @access  Private
 */
const discoverResearchTopics = asyncHandler(async (req, res) => {
  const { keywords, domain, depth = 'standard', maxTopics = 10 } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供至少一个关键词'
    });
  }

  try {
    console.log(`🔍 发现研究主题: ${keywords.join(', ')}`);
    
    // 基于关键词搜索相关文档
    const relatedDocs = await Document.find({
      $or: [
        { 'aiAnalysis.keywords': { $in: keywords } },
        { tags: { $in: keywords } },
        { title: { $regex: keywords.join('|'), $options: 'i' } }
      ]
    })
    .populate('uploadedBy', 'username')
    .select('title aiAnalysis.keywords aiAnalysis.summary createdAt uploadedBy')
    .limit(50);

    // 使用AI分析发现新的研究主题
    const topicAnalysisPrompt = `
    基于以下关键词和相关文档信息，发现和推荐新的研究主题和方向：
    
    关键词: ${keywords.join(', ')}
    领域: ${domain || '通用'}
    
    相关文档摘要:
    ${relatedDocs.map(doc => `- ${doc.title}: ${doc.aiAnalysis?.summary || '无摘要'}`).join('\n')}
    
    请提供：
    1. 5-${maxTopics}个新的研究主题
    2. 每个主题的研究价值和可行性评估
    3. 推荐的研究方法
    4. 潜在的研究挑战
    5. 相关的学术资源建议
    
    请用JSON格式返回结果。
    `;

    const aiResponse = await aiService.callAI(topicAnalysisPrompt, {
      systemPrompt: '你是一个资深的学术研究顾问，擅长发现新的研究方向和主题。',
      temperature: 0.7,
      maxTokens: 1500
    });

    let discoveredTopics;
    try {
      discoveredTopics = JSON.parse(aiResponse);
    } catch (e) {
      // 解析失败时的后备方案
      discoveredTopics = {
        topics: [],
        note: 'AI响应解析失败，使用基础主题发现',
        rawResponse: aiResponse
      };
    }

    res.status(200).json({
      success: true,
      message: '研究主题发现完成',
      data: {
        inputKeywords: keywords,
        domain: domain,
        relatedDocumentsCount: relatedDocs.length,
        discoveredTopics: discoveredTopics,
        recommendations: {
          nextSteps: [
            '深入研究感兴趣的主题',
            '查找相关的最新学术文献',
            '建立研究假设和方法',
            '寻找合作机会和资源'
          ],
          resources: [
            '学术数据库检索',
            '专业期刊订阅',
            '学术会议参与',
            '专家网络建立'
          ]
        }
      }
    });

  } catch (error) {
    console.error('研究主题发现失败:', error);
    res.status(500).json({
      success: false,
      message: '研究主题发现失败',
      error: error.message
    });
  }
});

/**
 * 智能文献综述生成
 * @route   POST /api/ai/enhanced/generate-literature-review
 * @access  Private
 */
const generateLiteratureReview = asyncHandler(async (req, res) => {
  const { 
    topic, 
    documentIds = [], 
    includeWeb = false, 
    style = 'academic',
    length = 'medium' 
  } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      message: '请提供综述主题'
    });
  }

  try {
    console.log(`📚 生成文献综述: ${topic}`);
    
    // 获取相关文档
    let relevantDocs = [];
    
    if (documentIds.length > 0) {
      relevantDocs = await Document.find({
        _id: { $in: documentIds },
        $or: [
          { uploadedBy: req.user.id },
          { 'permissions.isPublic': true },
          { 'permissions.allowedUsers': req.user.id }
        ]
      }).select('title aiAnalysis.summary aiAnalysis.keywords createdAt uploadedBy');
    } else {
      // 智能搜索相关文档
      const searchResults = await intelligentSearchService.intelligentSearch(
        topic,
        { searchType: 'hybrid', maxResults: 15 },
        req.user.id
      );
      relevantDocs = searchResults.results.documents || [];
    }

    if (relevantDocs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未找到相关文档，请提供文档ID或确保存在相关文档'
      });
    }

    // 准备综述内容
    const literatureData = relevantDocs.map(doc => ({
      title: doc.title,
      summary: doc.aiAnalysis?.summary || doc.description || '无摘要',
      keywords: doc.aiAnalysis?.keywords || [],
      author: doc.uploadedBy?.username || 'Unknown',
      year: new Date(doc.createdAt).getFullYear()
    }));

    // 生成文献综述
    const reviewPrompt = `
    请基于以下文献资料生成一份关于"${topic}"的文献综述：
    
    文献资料：
    ${literatureData.map((doc, index) => 
      `${index + 1}. ${doc.title} (${doc.author}, ${doc.year})
      摘要: ${doc.summary}
      关键词: ${doc.keywords.join(', ')}`
    ).join('\n\n')}
    
    综述要求：
    - 风格: ${style === 'academic' ? '学术性' : '通俗易懂'}
    - 长度: ${length === 'short' ? '简短(500字)' : length === 'long' ? '详细(2000字)' : '中等(1000字)'}
    - 包含引言、主体内容、结论和未来研究方向
    - 突出主要观点、争议点和研究空白
    - 提供清晰的逻辑结构和论述
    `;

    const review = await aiService.callAI(reviewPrompt, {
      systemPrompt: '你是一个资深的学术写作专家，擅长撰写高质量的文献综述。',
      temperature: 0.6,
      maxTokens: length === 'long' ? 3000 : length === 'short' ? 800 : 1500
    });

    // 生成引用格式
    const citations = literatureData.map((doc, index) => ({
      id: index + 1,
      format: `${doc.author} (${doc.year}). ${doc.title}.`,
      inText: `(${doc.author}, ${doc.year})`
    }));

    res.status(200).json({
      success: true,
      message: '文献综述生成完成',
      data: {
        topic: topic,
        review: review,
        citations: citations,
        metadata: {
          sourceCount: literatureData.length,
          style: style,
          length: length,
          wordCount: review.length,
          generatedAt: new Date()
        },
        sources: literatureData
      }
    });

  } catch (error) {
    console.error('文献综述生成失败:', error);
    res.status(500).json({
      success: false,
      message: '文献综述生成失败',
      error: error.message
    });
  }
});

/**
 * 研究方法推荐
 * @route   POST /api/ai/enhanced/recommend-methods
 * @access  Private
 */
const recommendResearchMethods = asyncHandler(async (req, res) => {
  const { 
    researchQuestion, 
    field, 
    dataType, 
    resources = 'medium',
    timeline = 'medium' 
  } = req.body;

  if (!researchQuestion) {
    return res.status(400).json({
      success: false,
      message: '请提供研究问题'
    });
  }

  try {
    console.log(`🔬 推荐研究方法: ${researchQuestion}`);
    
    const methodsPrompt = `
    基于以下研究信息，推荐适合的研究方法：
    
    研究问题: ${researchQuestion}
    研究领域: ${field || '未指定'}
    数据类型: ${dataType || '混合'}
    资源情况: ${resources} (low/medium/high)
    时间安排: ${timeline} (short/medium/long)
    
    请提供：
    1. 3-5种推荐的研究方法
    2. 每种方法的适用性分析
    3. 所需资源和时间估算
    4. 优缺点对比
    5. 具体实施步骤
    6. 潜在的挑战和解决方案
    7. 数据收集和分析建议
    
    请用JSON格式返回结果。
    `;

    const aiResponse = await aiService.callAI(methodsPrompt, {
      systemPrompt: '你是一个资深的研究方法专家，熟悉各种定量和定性研究方法。',
      temperature: 0.5,
      maxTokens: 2000
    });

    let recommendations;
    try {
      recommendations = JSON.parse(aiResponse);
    } catch (e) {
      recommendations = {
        methods: [],
        note: '推荐解析失败',
        rawResponse: aiResponse
      };
    }

    // 添加方法适用性评分
    if (recommendations.methods && Array.isArray(recommendations.methods)) {
      recommendations.methods = recommendations.methods.map(method => ({
        ...method,
        suitabilityScore: this.calculateMethodSuitability(method, {
          researchQuestion,
          field,
          dataType,
          resources,
          timeline
        })
      }));
    }

    res.status(200).json({
      success: true,
      message: '研究方法推荐完成',
      data: {
        researchQuestion: researchQuestion,
        context: {
          field,
          dataType,
          resources,
          timeline
        },
        recommendations: recommendations,
        additionalResources: {
          methodologyBooks: [
            '研究方法指南',
            '定量研究方法',
            '定性研究方法',
            '混合研究方法'
          ],
          onlineResources: [
            '研究方法论在线课程',
            '统计软件教程',
            '数据分析工具',
            '学术写作指南'
          ]
        }
      }
    });

  } catch (error) {
    console.error('研究方法推荐失败:', error);
    res.status(500).json({
      success: false,
      message: '研究方法推荐失败',
      error: error.message
    });
  }
});

/**
 * 获取AI增强分析历史
 * @route   GET /api/ai/enhanced/analysis-history
 * @access  Private
 */
const getEnhancedAnalysisHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type = 'all' } = req.query;

  try {
    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const query = {
      $or: [
        { uploadedBy: req.user.id },
        { 'permissions.isPublic': true },
        { 'permissions.allowedUsers': req.user.id }
      ]
    };

    // 只查找已进行增强分析的文档
    query['aiAnalysis.enhanced'] = { $exists: true };

    if (type !== 'all') {
      query['aiAnalysis.status'] = type;
    }

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('uploadedBy', 'username profile.firstName profile.lastName')
        .select('title aiAnalysis createdAt uploadedBy documentType')
        .sort({ 'aiAnalysis.enhancedAt': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Document.countDocuments(query)
    ]);

    const analysisHistory = documents.map(doc => ({
      documentId: doc._id,
      title: doc.title,
      documentType: doc.documentType,
      author: doc.uploadedBy?.username || 'Unknown',
      createdAt: doc.createdAt,
      analysisStatus: doc.aiAnalysis?.status,
      enhancedAt: doc.aiAnalysis?.enhancedAt,
      hasSemanticAnalysis: !!doc.aiAnalysis?.enhanced?.semantic,
      hasTopicModeling: !!doc.aiAnalysis?.enhanced?.topics,
      hasEntityExtraction: !!doc.aiAnalysis?.enhanced?.entities,
      hasRelatedResearch: !!doc.aiAnalysis?.enhanced?.relatedResearch,
      researchSuggestionsCount: doc.aiAnalysis?.enhanced?.researchSuggestions?.suggestions?.length || 0
    }));

    res.status(200).json({
      success: true,
      data: {
        analysisHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        statistics: {
          totalAnalyzed: total,
          enhancedAnalysis: documents.filter(doc => doc.aiAnalysis?.enhanced).length,
          avgProcessingTime: 'N/A' // 可以后续添加
        }
      }
    });

  } catch (error) {
    console.error('获取增强分析历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分析历史失败',
      error: error.message
    });
  }
});

/**
 * 计算方法适用性评分
 */
function calculateMethodSuitability(method, context) {
  let score = 0.5; // 基础分数
  
  // 基于资源情况调整
  if (context.resources === 'low' && method.resourceRequirement === 'low') {
    score += 0.2;
  } else if (context.resources === 'high' && method.resourceRequirement === 'high') {
    score += 0.1;
  }
  
  // 基于时间安排调整
  if (context.timeline === 'short' && method.timeRequirement === 'short') {
    score += 0.2;
  } else if (context.timeline === 'long' && method.timeRequirement === 'long') {
    score += 0.1;
  }
  
  return Math.min(1, Math.max(0, score));
}

module.exports = {
  performDeepAnalysis,
  intelligentSearch,
  discoverResearchTopics,
  generateLiteratureReview,
  recommendResearchMethods,
  getEnhancedAnalysisHistory
};