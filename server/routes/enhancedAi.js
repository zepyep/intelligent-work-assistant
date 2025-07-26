/**
 * 增强AI功能路由
 * 提供深度分析、智能搜索、研究建议等高级AI功能
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  performDeepAnalysis,
  intelligentSearch,
  discoverResearchTopics,
  generateLiteratureReview,
  recommendResearchMethods,
  getEnhancedAnalysisHistory
} = require('../controllers/enhancedAiController');

/**
 * @swagger
 * tags:
 *   name: Enhanced AI
 *   description: 增强AI功能 - 深度分析、智能搜索、研究建议
 */

/**
 * @swagger
 * /api/ai/enhanced/analyze/{documentId}:
 *   post:
 *     summary: 执行文档深度分析
 *     tags: [Enhanced AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeSemanticAnalysis:
 *                 type: boolean
 *                 default: true
 *                 description: 是否包含语义分析
 *               includeTopicModeling:
 *                 type: boolean
 *                 default: true
 *                 description: 是否包含主题建模
 *               includeEntityExtraction:
 *                 type: boolean
 *                 default: true
 *                 description: 是否包含实体抽取
 *               includeRelatedResearch:
 *                 type: boolean
 *                 default: true
 *                 description: 是否查找相关研究
 *               language:
 *                 type: string
 *                 enum: [zh, en]
 *                 default: zh
 *                 description: 分析语言
 *     responses:
 *       200:
 *         description: 深度分析完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysisId:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         basic:
 *                           type: object
 *                           description: 基础分析结果
 *                         semantic:
 *                           type: object
 *                           description: 语义分析结果
 *                         topics:
 *                           type: object
 *                           description: 主题建模结果
 *                         entities:
 *                           type: object
 *                           description: 实体抽取结果
 *                         relatedResearch:
 *                           type: object
 *                           description: 相关研究
 *                         researchSuggestions:
 *                           type: object
 *                           description: 研究建议
 *                     processingTime:
 *                       type: number
 *                       description: 处理时间(毫秒)
 *       404:
 *         description: 文档未找到
 *       403:
 *         description: 无权限访问
 *       500:
 *         description: 服务器错误
 */
router.post('/analyze/:documentId', auth, performDeepAnalysis);

/**
 * @swagger
 * /api/ai/enhanced/search:
 *   post:
 *     summary: 执行智能搜索
 *     tags: [Enhanced AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: 搜索查询
 *                 example: "人工智能机器学习"
 *               searchType:
 *                 type: string
 *                 enum: [text, semantic, hybrid]
 *                 default: hybrid
 *                 description: 搜索类型
 *               includeWeb:
 *                 type: boolean
 *                 default: false
 *                 description: 是否包含网络搜索
 *               includeAcademic:
 *                 type: boolean
 *                 default: false
 *                 description: 是否包含学术搜索
 *               filterType:
 *                 type: string
 *                 description: 文档类型过滤
 *               sortBy:
 *                 type: string
 *                 enum: [relevance, date, title]
 *                 default: relevance
 *                 description: 排序方式
 *               maxResults:
 *                 type: integer
 *                 default: 20
 *                 minimum: 1
 *                 maximum: 100
 *                 description: 最大结果数
 *               enablePersonalization:
 *                 type: boolean
 *                 default: true
 *                 description: 是否启用个性化
 *     responses:
 *       200:
 *         description: 智能搜索完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     searchType:
 *                       type: string
 *                     results:
 *                       type: object
 *                       properties:
 *                         documents:
 *                           type: array
 *                           items:
 *                             type: object
 *                         web:
 *                           type: array
 *                           items:
 *                             type: object
 *                         academic:
 *                           type: array
 *                           items:
 *                             type: object
 *                         related:
 *                           type: array
 *                           items:
 *                             type: object
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         totalResults:
 *                           type: integer
 *                         searchTime:
 *                           type: number
 *                         suggestions:
 *                           type: array
 *                           items:
 *                             type: object
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/search', auth, intelligentSearch);

/**
 * @swagger
 * /api/ai/enhanced/discover-topics:
 *   post:
 *     summary: 发现研究主题
 *     tags: [Enhanced AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keywords
 *             properties:
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关键词列表
 *                 example: ["机器学习", "深度学习", "神经网络"]
 *               domain:
 *                 type: string
 *                 description: 研究领域
 *                 example: "计算机科学"
 *               depth:
 *                 type: string
 *                 enum: [basic, standard, deep]
 *                 default: standard
 *                 description: 分析深度
 *               maxTopics:
 *                 type: integer
 *                 default: 10
 *                 minimum: 3
 *                 maximum: 20
 *                 description: 最大主题数
 *     responses:
 *       200:
 *         description: 研究主题发现完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     inputKeywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                     domain:
 *                       type: string
 *                     relatedDocumentsCount:
 *                       type: integer
 *                     discoveredTopics:
 *                       type: object
 *                     recommendations:
 *                       type: object
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/discover-topics', auth, discoverResearchTopics);

/**
 * @swagger
 * /api/ai/enhanced/generate-literature-review:
 *   post:
 *     summary: 生成文献综述
 *     tags: [Enhanced AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: 综述主题
 *                 example: "深度学习在自然语言处理中的应用"
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 指定文档ID列表（可选）
 *               includeWeb:
 *                 type: boolean
 *                 default: false
 *                 description: 是否包含网络资源
 *               style:
 *                 type: string
 *                 enum: [academic, popular]
 *                 default: academic
 *                 description: 写作风格
 *               length:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 default: medium
 *                 description: 综述长度
 *     responses:
 *       200:
 *         description: 文献综述生成完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     topic:
 *                       type: string
 *                     review:
 *                       type: string
 *                       description: 生成的综述内容
 *                     citations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           format:
 *                             type: string
 *                           inText:
 *                             type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         sourceCount:
 *                           type: integer
 *                         style:
 *                           type: string
 *                         length:
 *                           type: string
 *                         wordCount:
 *                           type: integer
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/generate-literature-review', auth, generateLiteratureReview);

/**
 * @swagger
 * /api/ai/enhanced/recommend-methods:
 *   post:
 *     summary: 推荐研究方法
 *     tags: [Enhanced AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - researchQuestion
 *             properties:
 *               researchQuestion:
 *                 type: string
 *                 description: 研究问题
 *                 example: "如何提高机器学习模型的准确性？"
 *               field:
 *                 type: string
 *                 description: 研究领域
 *                 example: "机器学习"
 *               dataType:
 *                 type: string
 *                 description: 数据类型
 *                 example: "数值型数据"
 *               resources:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: 资源情况
 *               timeline:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 default: medium
 *                 description: 时间安排
 *     responses:
 *       200:
 *         description: 研究方法推荐完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     researchQuestion:
 *                       type: string
 *                     context:
 *                       type: object
 *                       properties:
 *                         field:
 *                           type: string
 *                         dataType:
 *                           type: string
 *                         resources:
 *                           type: string
 *                         timeline:
 *                           type: string
 *                     recommendations:
 *                       type: object
 *                       description: AI推荐的研究方法
 *                     additionalResources:
 *                       type: object
 *                       properties:
 *                         methodologyBooks:
 *                           type: array
 *                           items:
 *                             type: string
 *                         onlineResources:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/recommend-methods', auth, recommendResearchMethods);

/**
 * @swagger
 * /api/ai/enhanced/analysis-history:
 *   get:
 *     summary: 获取增强分析历史
 *     tags: [Enhanced AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, enhanced, completed, failed]
 *           default: all
 *         description: 分析状态过滤
 *     responses:
 *       200:
 *         description: 获取分析历史成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysisHistory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           documentId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           documentType:
 *                             type: string
 *                           author:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           analysisStatus:
 *                             type: string
 *                           enhancedAt:
 *                             type: string
 *                             format: date-time
 *                           hasSemanticAnalysis:
 *                             type: boolean
 *                           hasTopicModeling:
 *                             type: boolean
 *                           hasEntityExtraction:
 *                             type: boolean
 *                           hasRelatedResearch:
 *                             type: boolean
 *                           researchSuggestionsCount:
 *                             type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalAnalyzed:
 *                           type: integer
 *                         enhancedAnalysis:
 *                           type: integer
 *       500:
 *         description: 服务器错误
 */
router.get('/analysis-history', auth, getEnhancedAnalysisHistory);

module.exports = router;