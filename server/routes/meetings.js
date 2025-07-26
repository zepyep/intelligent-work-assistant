const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadConfigs } = require('../config/multer');
const meetingController = require('../controllers/meetingController');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: 获取会议列表
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *         description: 会议状态过滤
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期过滤
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期过滤
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 成功获取会议列表
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
 *                     $ref: '#/components/schemas/Meeting'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: 创建新会议
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - scheduledTime
 *             properties:
 *               title:
 *                 type: string
 *                 description: 会议标题
 *               description:
 *                 type: string
 *                 description: 会议描述
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 description: 计划会议时间
 *               duration:
 *                 type: integer
 *                 description: 会议时长（分钟）
 *                 default: 60
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 参会人员ID列表
 *               location:
 *                 type: string
 *                 description: 会议地点
 *               meetingType:
 *                 type: string
 *                 enum: [offline, online, hybrid]
 *                 default: offline
 *               agenda:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 会议议程
 *     responses:
 *       201:
 *         description: 会议创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Meeting'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 会议基础路由
router
  .route('/')
  .get(meetingController.getMeetings)
  .post(meetingController.createMeeting);

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: 获取单个会议详情
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会议ID
 *     responses:
 *       200:
 *         description: 成功获取会议详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Meeting'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 单个会议路由
router
  .route('/:id')
  .get(meetingController.getMeeting);

/**
 * @swagger
 * /api/meetings/{id}/audio:
 *   post:
 *     summary: 上传会议音频文件
 *     description: 上传会议录音文件进行语音转文字和智能分析
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会议ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: "音频文件，支持 mp3, wav, m4a 格式，最大50MB"
 *               language:
 *                 type: string
 *                 enum: [zh-CN, en-US, zh-TW]
 *                 default: zh-CN
 *                 description: 音频语言
 *               speakers:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: 说话人数量（用于说话人分离）
 *     responses:
 *       200:
 *         description: 音频上传成功，开始处理
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
 *                     audioUrl:
 *                       type: string
 *                     processingId:
 *                       type: string
 *                     estimatedTime:
 *                       type: integer
 *                       description: 预计处理时间（秒）
 *       400:
 *         description: 文件格式不支持或文件过大
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 会议音频上传
router.post('/:id/audio', uploadConfigs.meeting, meetingController.uploadAudio);

/**
 * @swagger
 * /api/meetings/{id}/transcription:
 *   get:
 *     summary: 获取会议转录结果
 *     description: 获取会议音频的语音转文字结果，包含时间戳和说话人信息
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会议ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [full, summary, keywords]
 *           default: full
 *         description: 返回格式
 *     responses:
 *       200:
 *         description: 成功获取转录结果
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
 *                     status:
 *                       type: string
 *                       enum: [processing, completed, failed]
 *                     progress:
 *                       type: number
 *                       description: 处理进度(0-100)
 *                     transcription:
 *                       type: object
 *                       properties:
 *                         fullText:
 *                           type: string
 *                           description: 完整转录文本
 *                         segments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               startTime:
 *                                 type: number
 *                                 description: 开始时间（秒）
 *                               endTime:
 *                                 type: number
 *                                 description: 结束时间（秒）
 *                               speaker:
 *                                 type: string
 *                                 description: 说话人标识
 *                               text:
 *                                 type: string
 *                                 description: 文本内容
 *                               confidence:
 *                                 type: number
 *                                 description: 置信度(0-1)
 *                         summary:
 *                           type: string
 *                           description: 会议摘要
 *                         keywords:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 关键词
 *                     audioInfo:
 *                       type: object
 *                       properties:
 *                         duration:
 *                           type: number
 *                           description: 音频时长（秒）
 *                         fileSize:
 *                           type: integer
 *                           description: 文件大小（字节）
 *                         format:
 *                           type: string
 *                           description: 音频格式
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 获取转录结果
router.get('/:id/transcription', meetingController.getTranscription);

/**
 * @swagger
 * /api/meetings/{id}/action-items:
 *   get:
 *     summary: 获取个性化行动清单
 *     description: 根据用户职位和会议内容生成个性化的行动清单
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会议ID
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: 指定职位角色（覆盖用户默认职位）
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, high, medium, low]
 *           default: all
 *         description: 优先级过滤
 *     responses:
 *       200:
 *         description: 成功获取个性化行动清单
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
 *                     userRole:
 *                       type: string
 *                       description: 用户职位
 *                     actionItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                             description: 行动项标题
 *                           description:
 *                             type: string
 *                             description: 详细描述
 *                           priority:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           category:
 *                             type: string
 *                             description: 类别（如：跟进、决策、执行等）
 *                           dueDate:
 *                             type: string
 *                             format: date-time
 *                             description: 建议完成时间
 *                           assignee:
 *                             type: string
 *                             description: 负责人
 *                           status:
 *                             type: string
 *                             enum: [pending, in_progress, completed]
 *                             default: pending
 *                           relatedSegments:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 startTime:
 *                                   type: number
 *                                 endTime:
 *                                   type: number
 *                                 text:
 *                                   type: string
 *                             description: 相关会议片段
 *                     insights:
 *                       type: object
 *                       properties:
 *                         roleAnalysis:
 *                           type: string
 *                           description: 基于职位的分析
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 建议
 *                         riskPoints:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 风险点
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 获取个性化行动清单
router.get('/:id/action-items', meetingController.getActionItems);

/**
 * @swagger
 * /api/meetings/{id}/action-items/{itemId}:
 *   put:
 *     summary: 更新行动项状态
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会议ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: 行动项ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               notes:
 *                 type: string
 *                 description: 更新备注
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *                 description: 完成时间（状态为completed时）
 *     responses:
 *       200:
 *         description: 行动项状态更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: 更新后的行动项
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 更新行动项状态
router.put('/:id/action-items/:itemId', meetingController.updateActionItem);

/**
 * @swagger
 * /api/meetings/{id}/reanalyze:
 *   post:
 *     summary: 重新分析会议
 *     description: 重新对会议录音进行AI分析，生成新的转录、摘要和行动项
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会议ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               options:
 *                 type: object
 *                 properties:
 *                   includeTranscription:
 *                     type: boolean
 *                     default: true
 *                     description: 是否重新转录
 *                   includeSummary:
 *                     type: boolean
 *                     default: true
 *                     description: 是否重新生成摘要
 *                   includeActionItems:
 *                     type: boolean
 *                     default: true
 *                     description: 是否重新生成行动项
 *                   language:
 *                     type: string
 *                     enum: [zh-CN, en-US, zh-TW]
 *                     description: 重新指定语言
 *               roleContext:
 *                 type: string
 *                 description: 额外的角色上下文信息
 *     responses:
 *       200:
 *         description: 重新分析任务已启动
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
 *                     processingId:
 *                       type: string
 *                     estimatedTime:
 *                       type: integer
 *                       description: 预计处理时间（秒）
 *       400:
 *         description: 会议没有音频文件或正在处理中
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 重新分析会议
router.post('/:id/reanalyze', meetingController.reanalyzeMeeting);

module.exports = router;