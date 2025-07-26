const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  analyzeDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  bulkAnalyze,
  getAnalysisHistory
} = require('../controllers/documentController');
const { uploadConfigs } = require('../config/multer');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

/**
 * @swagger
 * /api/documents/upload:
 *   post:
 *     summary: 上传文档文件
 *     description: 上传各种文档文件进行存储和管理
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "文档文件，支持 PDF, DOC, DOCX, TXT, MD 格式，最大20MB"
 *               title:
 *                 type: string
 *                 description: 文档标题（可选，默认使用文件名）
 *               description:
 *                 type: string
 *                 description: 文档描述
 *               category:
 *                 type: string
 *                 description: 文档分类
 *               tags:
 *                 type: string
 *                 description: 标签（逗号分隔）
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: 是否公开
 *               projectId:
 *                 type: string
 *                 description: 关联项目ID
 *     responses:
 *       201:
 *         description: 文档上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         description: 文件格式不支持或文件过大
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 文档上传和管理
router.post('/upload', uploadConfigs.document, uploadDocument);

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: 获取文档列表
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类过滤
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: 标签过滤（逗号分隔）
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: 项目过滤
 *       - in: query
 *         name: isAnalyzed
 *         schema:
 *           type: boolean
 *         description: 是否已分析过滤
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, size]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 成功获取文档列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalSize:
 *                       type: integer
 *                       description: 总文件大小（字节）
 *                     analyzedCount:
 *                       type: integer
 *                     categoryStats:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', getDocuments);

/**
 * @swagger
 * /api/documents/search:
 *   get:
 *     summary: 搜索文档
 *     description: 基于关键词、内容和元数据搜索文档
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: searchIn
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [title, content, tags, category]
 *           default: [title, content]
 *         description: 搜索范围
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 限制分类
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: 限制项目
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *         description: 日期范围
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: 搜索结果
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
 *                     results:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Document'
 *                           - type: object
 *                             properties:
 *                               relevanceScore:
 *                                 type: number
 *                                 description: 相关性分数 (0-1)
 *                               highlights:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                 description: 高亮片段
 *                     total:
 *                       type: integer
 *                     searchTime:
 *                       type: number
 *                       description: 搜索耗时（毫秒）
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 搜索建议
 *       400:
 *         description: 搜索关键词不能为空
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/search', searchDocuments);

/**
 * @swagger
 * /api/documents/{id}:
 *   get:
 *     summary: 获取文档详情
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档ID
 *       - in: query
 *         name: includeContent
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否包含文档内容
 *       - in: query
 *         name: includeAnalysis
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否包含AI分析结果
 *     responses:
 *       200:
 *         description: 成功获取文档详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Document'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       403:
 *         description: 没有访问权限
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   put:
 *     summary: 更新文档信息
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *               projectId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 文档更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       403:
 *         description: 没有修改权限
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   delete:
 *     summary: 删除文档
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档ID
 *     responses:
 *       200:
 *         description: 文档删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       403:
 *         description: 没有删除权限
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

/**
 * @swagger
 * /api/documents/{id}/analyze:
 *   post:
 *     summary: 分析文档内容
 *     description: 使用AI对文档进行智能分析，提取关键信息、生成摘要和结构化数据
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               analysisType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [summary, keywords, entities, sentiment, structure, topics]
 *                 default: [summary, keywords, entities]
 *                 description: 分析类型
 *               customPrompt:
 *                 type: string
 *                 description: 自定义分析提示词
 *               context:
 *                 type: object
 *                 properties:
 *                   projectContext:
 *                     type: string
 *                   businessDomain:
 *                     type: string
 *                   analysisGoal:
 *                     type: string
 *                 description: 分析上下文
 *               options:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                     enum: [zh-CN, en-US, auto]
 *                     default: auto
 *                   maxSummaryLength:
 *                     type: integer
 *                     default: 500
 *                   extractEntities:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: 分析任务已启动
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
 *                     status:
 *                       type: string
 *                       enum: [processing, completed, failed]
 *                     estimatedTime:
 *                       type: integer
 *                       description: 预计处理时间（秒）
 *       400:
 *         description: 文档不支持分析或正在分析中
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 文档分析
router.post('/:id/analyze', analyzeDocument);

/**
 * @swagger
 * /api/documents/{id}/analysis-history:
 *   get:
 *     summary: 获取文档分析历史
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 文档ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: 成功获取分析历史
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       analysisType:
 *                         type: array
 *                         items:
 *                           type: string
 *                       status:
 *                         type: string
 *                       results:
 *                         type: object
 *                         properties:
 *                           summary:
 *                             type: string
 *                           keywords:
 *                             type: array
 *                             items:
 *                               type: string
 *                           entities:
 *                             type: array
 *                             items:
 *                               type: object
 *                           sentiment:
 *                             type: object
 *                           topics:
 *                             type: array
 *                             items:
 *                               type: object
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                       processingTime:
 *                         type: number
 *                         description: 处理时间（秒）
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id/analysis-history', getAnalysisHistory);

/**
 * @swagger
 * /api/documents/bulk-analyze:
 *   post:
 *     summary: 批量分析文档（管理员功能）
 *     description: 同时对多个文档进行批量AI分析，仅管理员可用
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentIds
 *             properties:
 *               documentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要分析的文档ID列表
 *                 maxItems: 50
 *               analysisType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [summary, keywords, entities, sentiment, structure, topics]
 *                 default: [summary, keywords]
 *               batchOptions:
 *                 type: object
 *                 properties:
 *                   priority:
 *                     type: string
 *                     enum: [low, normal, high]
 *                     default: normal
 *                   maxConcurrency:
 *                     type: integer
 *                     default: 3
 *                     maximum: 10
 *                   notifyOnComplete:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: 批量分析任务已启动
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
 *                     batchId:
 *                       type: string
 *                     totalDocuments:
 *                       type: integer
 *                     estimatedTime:
 *                       type: integer
 *                       description: 预计完成时间（秒）
 *                     status:
 *                       type: string
 *                       enum: [queued, processing, completed, failed]
 *       400:
 *         description: 文档列表为空或超出限制
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 权限不足，仅管理员可用
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 批量分析（管理员功能）
router.post('/bulk-analyze', authorize('admin', 'super_admin'), bulkAnalyze);

module.exports = router;