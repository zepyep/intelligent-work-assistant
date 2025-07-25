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

// 文档上传和管理
router.post('/upload', uploadConfigs.document, uploadDocument);
router.get('/', getDocuments);
router.get('/search', searchDocuments);
router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// 文档分析
router.post('/:id/analyze', analyzeDocument);
router.get('/:id/analysis-history', getAnalysisHistory);

// 批量分析（管理员功能）
router.post('/bulk-analyze', authorize('admin', 'super_admin'), bulkAnalyze);

module.exports = router;