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

// 任务基础CRUD
router.route('/')
  .get(getTasks)
  .post(createTask);

// AI相关路由
router.post('/ai-planning', generateTaskPlanning);
router.post('/create-from-ai', createTaskFromAI);

// 统计路由
router.get('/stats', getTaskStats);

// 单个任务路由
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// 任务评论
router.post('/:id/comments', addTaskComment);

module.exports = router;