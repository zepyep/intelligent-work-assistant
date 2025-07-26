const express = require('express');
const {
  getTasks,
  createTask,
  generateTaskPlanning,
  createTaskFromAI,
  getTask,
  updateTask,
  deleteTask,
  getTaskStats,
  addTaskComment
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: 获取任务列表
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed]
 *         description: 任务状态过滤
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: 优先级过滤
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
 *           default: 10
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 成功获取任务列表
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
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     summary: 创建新任务
 *     tags: [Tasks]
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
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: 任务标题
 *               description:
 *                 type: string
 *                 description: 任务描述
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: 截止日期
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 分配给的用户ID列表
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 任务标签
 *     responses:
 *       201:
 *         description: 任务创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 任务基础CRUD
router.route('/')
  .get(getTasks)
  .post(createTask);

/**
 * @swagger
 * /api/tasks/ai-planning:
 *   post:
 *     summary: AI任务规划生成
 *     description: 根据输入的任务描述，AI生成3种以上的任务规划方案
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskDescription
 *             properties:
 *               taskDescription:
 *                 type: string
 *                 description: 任务描述
 *                 example: "开发一个用户管理系统"
 *               constraints:
 *                 type: object
 *                 properties:
 *                   deadline:
 *                     type: string
 *                     format: date
 *                   budget:
 *                     type: number
 *                   teamSize:
 *                     type: integer
 *               preferences:
 *                 type: object
 *                 properties:
 *                   methodology:
 *                     type: string
 *                     enum: [agile, waterfall, kanban]
 *                   focus:
 *                     type: string
 *                     enum: [speed, quality, cost]
 *     responses:
 *       200:
 *         description: 成功生成任务规划方案
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
 *                     plans:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           duration:
 *                             type: string
 *                           phases:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 duration:
 *                                   type: string
 *                                 tasks:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *                           pros:
 *                             type: array
 *                             items:
 *                               type: string
 *                           cons:
 *                             type: array
 *                             items:
 *                               type: string
 *                           estimatedCost:
 *                             type: number
 *                           riskLevel:
 *                             type: string
 *                             enum: [low, medium, high]
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// AI相关路由
router.post('/ai-planning', generateTaskPlanning);

/**
 * @swagger
 * /api/tasks/create-from-ai:
 *   post:
 *     summary: 从AI规划创建任务
 *     description: 根据AI生成的规划方案创建具体的任务
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 description: AI生成的规划方案ID
 *               customizations:
 *                 type: object
 *                 properties:
 *                   adjustedDeadline:
 *                     type: string
 *                     format: date-time
 *                   selectedPhases:
 *                     type: array
 *                     items:
 *                       type: string
 *                   additionalRequirements:
 *                     type: string
 *     responses:
 *       201:
 *         description: 成功从AI规划创建任务
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
 *                     createdTasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *                     planSummary:
 *                       type: object
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/create-from-ai', createTaskFromAI);

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: 获取任务统计信息
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: 统计时间周期
 *     responses:
 *       200:
 *         description: 成功获取任务统计
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
 *                     totalTasks:
 *                       type: integer
 *                     completedTasks:
 *                       type: integer
 *                     pendingTasks:
 *                       type: integer
 *                     overdueTasks:
 *                       type: integer
 *                     tasksByStatus:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                         in_progress:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                     tasksByPriority:
 *                       type: object
 *                       properties:
 *                         low:
 *                           type: integer
 *                         medium:
 *                           type: integer
 *                         high:
 *                           type: integer
 *                         urgent:
 *                           type: integer
 *                     completionRate:
 *                       type: number
 *                       description: 完成率百分比
 *                     averageCompletionTime:
 *                       type: number
 *                       description: 平均完成时间(天)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 统计路由
router.get('/stats', getTaskStats);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: 获取单个任务详情
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 成功获取任务详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   put:
 *     summary: 更新任务
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
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
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: 任务更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   delete:
 *     summary: 删除任务
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 任务删除成功
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
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 单个任务路由
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/comments:
 *   post:
 *     summary: 添加任务评论
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 任务ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 评论内容
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 附件文件ID列表
 *     responses:
 *       201:
 *         description: 评论添加成功
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
 *                     comment:
 *                       $ref: '#/components/schemas/Comment'
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// 任务评论
router.post('/:id/comments', addTaskComment);

module.exports = router;