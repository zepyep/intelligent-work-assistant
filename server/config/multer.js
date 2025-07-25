const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 创建子目录
const createSubDirs = () => {
  const subDirs = ['documents', 'audio', 'images', 'temp'];
  subDirs.forEach(dir => {
    const subDir = path.join(uploadDir, dir);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
  });
};
createSubDirs();

// 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subDir = 'temp';
    
    // 根据文件类型选择存储目录
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      subDir = 'audio';
    } else if (
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('document') ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('presentation')
    ) {
      subDir = 'documents';
    }
    
    cb(null, path.join(uploadDir, subDir));
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedTypes = [
    // 图片
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    
    // 文档
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    
    // 音频
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    
    // 视频（会议录像）
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 基础上传配置
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 默认10MB
    files: 5 // 最多5个文件
  }
});

// 特定用途的上传配置
const uploadConfigs = {
  // 单个文档上传
  document: upload.single('document'),
  
  // 单个音频文件上传
  audio: upload.single('audio'),
  
  // 单个图片上传
  image: upload.single('image'),
  
  // 多个文件上传
  multiple: upload.array('files', 5),
  
  // 会议录音上传（更大的文件限制）
  meeting: multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      // 允许音频、视频文件和文本文件（用于测试）
      if (file.mimetype.startsWith('audio/') || 
          file.mimetype.startsWith('video/') || 
          file.mimetype === 'text/plain') {
        cb(null, true);
      } else {
        cb(new Error('只允许上传音频、视频文件或文本文件'), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    }
  }).single('meetingFile')
};

// 文件清理工具
const cleanupTempFiles = () => {
  const tempDir = path.join(uploadDir, 'temp');
  const maxAge = 24 * 60 * 60 * 1000; // 24小时
  
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`清理临时文件: ${file}`);
      }
    });
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};

// 定时清理临时文件（每小时执行一次）
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// 获取文件信息的工具函数
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date()
  };
};

module.exports = {
  upload,
  uploadConfigs,
  getFileInfo,
  cleanupTempFiles
};