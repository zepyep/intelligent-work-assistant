const Document = require('../models/Document');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');

/**
 * 上传文档
 * @route   POST /api/documents/upload
 * @access  Private
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的文件'
    });
  }

  const { title, description, documentType, tags, category, project } = req.body;

  // 文档类型验证
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  if (!allowedTypes.includes(req.file.mimetype)) {
    // 删除上传的文件
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: '不支持的文件类型。支持的格式: PDF, Word, Excel, TXT'
    });
  }

  try {
    // 提取文本内容
    let extractedText = '';
    
    switch (req.file.mimetype) {
      case 'application/pdf':
        extractedText = await extractTextFromPDF(req.file.path);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extractedText = await extractTextFromWord(req.file.path);
        break;
      case 'text/plain':
        extractedText = fs.readFileSync(req.file.path, 'utf8');
        break;
      default:
        extractedText = '文档内容提取失败';
    }

    // 创建文档记录
    const document = await Document.create({
      title: title || req.file.originalname,
      description: description || '',
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      documentType: documentType || 'other',
      uploadedBy: req.user.id,
      extractedText,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      category: category || '未分类',
      project: project ? JSON.parse(project) : undefined
    });

    await document.populate('uploadedBy', 'username profile.firstName profile.lastName');

    // 自动启动基础分析
    if (extractedText && extractedText.length > 50) {
      try {
        await performAutoAnalysis(document._id, extractedText);
      } catch (error) {
        console.error('自动分析失败:', error);
        // 不影响文档上传的成功
      }
    }

    res.status(201).json({
      success: true,
      message: '文档上传成功',
      data: {
        document: {
          ...document.toObject(),
          extractedText: undefined // 不返回完整文本
        }
      }
    });

  } catch (error) {
    // 出错时删除上传的文件
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error;
  }
});

/**
 * 获取文档列表
 * @route   GET /api/documents
 * @access  Private
 */
const getDocuments = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    documentType,
    category,
    tags,
    sortBy = 'createdAt',
    sortOrder = -1,
    analyzed // 是否已分析
  } = req.query;

  // 构建查询条件
  const query = {
    $or: [
      { uploadedBy: req.user.id },
      { 'permissions.isPublic': true },
      { 'permissions.allowedUsers': req.user.id }
    ]
  };

  if (documentType) query.documentType = documentType;
  if (category) query.category = category;
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    query.tags = { $in: tagArray };
  }
  if (analyzed === 'true') {
    query['aiAnalysis.status'] = 'completed';
  } else if (analyzed === 'false') {
    query['aiAnalysis.status'] = { $ne: 'completed' };
  }

  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    Document.find(query)
      .populate('uploadedBy', 'username profile.firstName profile.lastName')
      .select('-extractedText') // 不返回完整文本
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit)),
    Document.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * 获取单个文档详情
 * @route   GET /api/documents/:id
 * @access  Private
 */
const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)
    .populate('uploadedBy', 'username profile.firstName profile.lastName')
    .populate('permissions.allowedUsers', 'username');

  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档未找到'
    });
  }

  // 权限检查
  if (!hasDocumentAccess(document, req.user)) {
    return res.status(403).json({
      success: false,
      message: '无权访问此文档'
    });
  }

  res.status(200).json({
    success: true,
    data: { document }
  });
});

/**
 * 分析文档
 * @route   POST /api/documents/:id/analyze
 * @access  Private
 */
const analyzeDocument = asyncHandler(async (req, res) => {
  const { analysisType = 'comprehensive' } = req.body;
  
  // 显式选择extractedText字段
  const document = await Document.findById(req.params.id).select('+extractedText');
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档未找到'
    });
  }

  // 权限检查
  if (!hasDocumentAccess(document, req.user)) {
    return res.status(403).json({
      success: false,
      message: '无权分析此文档'
    });
  }

  if (!document.extractedText || document.extractedText.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '文档文本提取失败，无法进行分析'
    });
  }

  try {
    // 更新分析状态
    document.aiAnalysis.status = 'processing';
    await document.save();

    // 执行分析
    const analysis = await performDocumentAnalysis(document.extractedText, analysisType);

    // 更新文档分析结果
    document.aiAnalysis = {
      ...document.aiAnalysis,
      ...analysis,
      status: 'completed',
      analyzedAt: new Date()
    };
    
    await document.save();
    await document.populate('uploadedBy', 'username profile.firstName profile.lastName');

    res.status(200).json({
      success: true,
      message: '文档分析完成',
      data: {
        document,
        analysis
      }
    });

  } catch (error) {
    // 更新分析状态为失败
    document.aiAnalysis.status = 'failed';
    document.aiAnalysis.error = error.message;
    await document.save();

    console.error('文档分析失败:', error);
    res.status(500).json({
      success: false,
      message: `文档分析失败: ${error.message}`
    });
  }
});

/**
 * 搜索文档
 * @route   GET /api/documents/search
 * @access  Private
 */
const searchDocuments = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: '请提供搜索关键词'
    });
  }

  const query = {
    $and: [
      // 权限过滤
      {
        $or: [
          { uploadedBy: req.user.id },
          { 'permissions.isPublic': true },
          { 'permissions.allowedUsers': req.user.id }
        ]
      },
      // 搜索条件
      {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $regex: q, $options: 'i' } },
          { 'aiAnalysis.keywords': { $regex: q, $options: 'i' } },
          { 'aiAnalysis.summary': { $regex: q, $options: 'i' } }
        ]
      }
    ]
  };

  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    Document.find(query)
      .populate('uploadedBy', 'username profile.firstName profile.lastName')
      .select('-extractedText')
      .sort({ 'aiAnalysis.analyzedAt': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Document.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    data: {
      documents,
      searchQuery: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * 更新文档信息
 * @route   PUT /api/documents/:id
 * @access  Private
 */
const updateDocument = asyncHandler(async (req, res) => {
  const { title, description, tags, category, permissions } = req.body;
  
  const document = await Document.findById(req.params.id);
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档未找到'
    });
  }

  // 只允许上传者修改
  if (document.uploadedBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: '只能修改自己上传的文档'
    });
  }

  // 更新字段
  if (title) document.title = title;
  if (description !== undefined) document.description = description;
  if (tags) document.tags = tags;
  if (category) document.category = category;
  if (permissions) document.permissions = { ...document.permissions, ...permissions };

  await document.save();
  await document.populate('uploadedBy', 'username profile.firstName profile.lastName');

  res.status(200).json({
    success: true,
    message: '文档更新成功',
    data: { document }
  });
});

/**
 * 删除文档
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档未找到'
    });
  }

  // 只允许上传者删除
  if (document.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '只能删除自己上传的文档'
    });
  }

  // 删除文件
  if (fs.existsSync(document.path)) {
    fs.unlinkSync(document.path);
  }

  await Document.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: '文档删除成功'
  });
});

/**
 * 获取分析历史
 * @route   GET /api/documents/:id/analysis-history
 * @access  Private
 */
const getAnalysisHistory = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  
  if (!document) {
    return res.status(404).json({
      success: false,
      message: '文档未找到'
    });
  }

  if (!hasDocumentAccess(document, req.user)) {
    return res.status(403).json({
      success: false,
      message: '无权访问此文档'
    });
  }

  // 返回分析历史（简化版）
  const analysisHistory = {
    currentAnalysis: document.aiAnalysis,
    analysisCount: document.aiAnalysis.status === 'completed' ? 1 : 0,
    lastAnalyzedAt: document.aiAnalysis.analyzedAt
  };

  res.status(200).json({
    success: true,
    data: { analysisHistory }
  });
});

/**
 * 批量分析文档
 * @route   POST /api/documents/bulk-analyze
 * @access  Private (Admin)
 */
const bulkAnalyze = asyncHandler(async (req, res) => {
  const { documentIds, analysisType = 'comprehensive' } = req.body;

  if (!documentIds || !Array.isArray(documentIds)) {
    return res.status(400).json({
      success: false,
      message: '请提供文档ID数组'
    });
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const documentId of documentIds) {
    try {
      const document = await Document.findById(documentId);
      
      if (!document) {
        results.push({
          documentId,
          success: false,
          message: '文档未找到'
        });
        failureCount++;
        continue;
      }

      if (!document.extractedText) {
        results.push({
          documentId,
          success: false,
          message: '文档无可分析的文本内容'
        });
        failureCount++;
        continue;
      }

      // 执行分析
      document.aiAnalysis.status = 'processing';
      await document.save();

      const analysis = await performDocumentAnalysis(document.extractedText, analysisType);

      document.aiAnalysis = {
        ...document.aiAnalysis,
        ...analysis,
        status: 'completed',
        analyzedAt: new Date()
      };
      
      await document.save();

      results.push({
        documentId,
        success: true,
        message: '分析完成'
      });
      successCount++;

    } catch (error) {
      // 更新失败状态
      try {
        await Document.findByIdAndUpdate(documentId, {
          'aiAnalysis.status': 'failed',
          'aiAnalysis.error': error.message
        });
      } catch (updateError) {
        console.error('更新文档状态失败:', updateError);
      }

      results.push({
        documentId,
        success: false,
        message: error.message
      });
      failureCount++;
    }
  }

  res.status(200).json({
    success: true,
    message: `批量分析完成，成功: ${successCount}，失败: ${failureCount}`,
    data: {
      results,
      summary: {
        total: documentIds.length,
        success: successCount,
        failure: failureCount
      }
    }
  });
});

// 辅助函数

/**
 * 检查文档访问权限
 */
function hasDocumentAccess(document, user) {
  return (
    document.uploadedBy.toString() === user.id ||
    document.permissions?.isPublic ||
    document.permissions?.allowedUsers?.includes(user.id) ||
    user.role === 'admin' ||
    user.role === 'super_admin'
  );
}

/**
 * 从PDF提取文本
 */
async function extractTextFromPDF(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', pdfData => {
      try {
        let text = '';
        pdfData.formImage.Pages.forEach(page => {
          page.Texts.forEach(textObj => {
            textObj.R.forEach(run => {
              text += decodeURIComponent(run.T) + ' ';
            });
          });
        });
        resolve(text.trim());
      } catch (error) {
        reject(error);
      }
    });
    
    pdfParser.loadPDF(filePath);
  });
}

/**
 * 从Word文档提取文本
 */
async function extractTextFromWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Word文档读取失败: ${error.message}`);
  }
}

/**
 * 执行文档分析
 */
async function performDocumentAnalysis(text, analysisType) {
  try {
    // 使用AI服务进行分析
    const analysis = await aiService.analyzeDocument(text, analysisType);
    
    // 解析和结构化结果
    return {
      summary: analysis.summary,
      keywords: extractKeywords(analysis.summary),
      keyPoints: extractKeyPoints(analysis.summary),
      actionItems: extractActionItems(analysis.summary),
      structure: analyzeDocumentStructure(text),
      sentiment: analyzeSentiment(analysis.summary)
      // language field removed to avoid MongoDB compatibility issues
    };
  } catch (error) {
    // 如果AI分析失败，返回基础分析结果
    console.error('AI分析失败，使用基础分析:', error);
    return await performBasicAnalysis(text);
  }
}

/**
 * 基础分析（当AI不可用时）
 */
async function performBasicAnalysis(text) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
  
  return {
    summary: `文档包含约 ${words.length} 个词，${sentences.length} 个句子。` + 
             (sentences.length > 0 ? `开头：${sentences[0].trim().substring(0, 100)}...` : ''),
    keywords: extractBasicKeywords(text),
    keyPoints: sentences.slice(0, 5).map(s => s.trim()),
    actionItems: [],
    structure: {
      sections: [{
        title: '全文',
        content: text.substring(0, 500),
        wordCount: words.length
      }],
      totalWords: words.length,
      totalPages: Math.ceil(words.length / 300)
    },
    sentiment: { overall: 'neutral', confidence: 0.5 }
    // language field removed to avoid MongoDB compatibility issues
  };
}

/**
 * 自动分析（上传后）
 */
async function performAutoAnalysis(documentId, text) {
  try {
    const analysis = await performDocumentAnalysis(text, 'summary');
    
    await Document.findByIdAndUpdate(documentId, {
      aiAnalysis: {
        ...analysis,
        status: 'completed',
        analyzedAt: new Date()
      }
    });
  } catch (error) {
    console.error('自动分析失败:', error);
    await Document.findByIdAndUpdate(documentId, {
      'aiAnalysis.status': 'failed',
      'aiAnalysis.error': error.message
    });
  }
}

/**
 * 提取关键词（简单实现）
 */
function extractKeywords(text) {
  const stopWords = new Set(['的', '了', '在', '是', '和', '与', '及', '或', '但', '然而', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const words = text.toLowerCase().match(/[\u4e00-\u9fa5a-zA-Z]+/g) || [];
  const wordCount = {};
  
  words.forEach(word => {
    if (word.length > 1 && !stopWords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * 提取基础关键词
 */
function extractBasicKeywords(text) {
  return extractKeywords(text);
}

/**
 * 提取要点
 */
function extractKeyPoints(text) {
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 5).map(s => s.trim());
}

/**
 * 提取行动项
 */
function extractActionItems(text) {
  const actionVerbs = ['需要', '应该', '必须', '要求', '建议', '计划', '安排', 'need', 'should', 'must', 'require'];
  const sentences = text.split(/[.!?。！？]/);
  
  return sentences
    .filter(sentence => actionVerbs.some(verb => sentence.includes(verb)))
    .slice(0, 5)
    .map((content, index) => ({
      content: content.trim(),
      priority: 'medium'
    }));
}

/**
 * 分析文档结构
 */
function analyzeDocumentStructure(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const words = text.split(/\s+/).length;
  
  return {
    sections: paragraphs.slice(0, 10).map((content, index) => ({
      title: `段落 ${index + 1}`,
      content: content.substring(0, 200),
      wordCount: content.split(/\s+/).length
    })),
    totalWords: words,
    totalPages: Math.ceil(words / 300)
  };
}

/**
 * 情感分析（简单实现）
 */
function analyzeSentiment(text) {
  const positiveWords = ['好', '优秀', '成功', '满意', '良好', 'good', 'excellent', 'success', 'positive'];
  const negativeWords = ['坏', '失败', '问题', '困难', '错误', 'bad', 'fail', 'problem', 'error'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    positiveCount += (text.match(new RegExp(word, 'gi')) || []).length;
  });
  
  negativeWords.forEach(word => {
    negativeCount += (text.match(new RegExp(word, 'gi')) || []).length;
  });
  
  if (positiveCount > negativeCount) {
    return { overall: 'positive', confidence: 0.7 };
  } else if (negativeCount > positiveCount) {
    return { overall: 'negative', confidence: 0.7 };
  }
  
  return { overall: 'neutral', confidence: 0.6 };
}

/**
 * 语言检测
 */
function detectLanguage(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalChars = text.length;
  
  if (chineseChars / totalChars > 0.3) {
    return 'zh';
  }
  return 'en';
}

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  analyzeDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  bulkAnalyze,
  getAnalysisHistory
};