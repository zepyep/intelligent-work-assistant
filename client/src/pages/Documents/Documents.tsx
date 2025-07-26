import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Alert,
  LinearProgress,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  CircularProgress,
} from '@mui/material';
import CustomGrid from '../../components/common/CustomGrid';
const Grid = CustomGrid;
import {
  Add,
  Upload,
  Description,
  PictureAsPdf,
  Article,
  TableChart,
  Image,
  Folder,
  Delete,
  Download,
  Visibility,
  ExpandMore,
  Refresh,
  Search,
  FilterList,
  CloudUpload,
  Analytics,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';

interface Document {
  _id: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  analysis: {
    isAnalyzed: boolean;
    summary: string;
    keyPoints: string[];
    category: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    entities: string[];
    analyzedAt: string;
  } | null;
  tags: string[];
  projectId?: string;
  uploadedBy: string;
}

// Removed unused AnalysisResult interface

const Documents: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/documents');
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      // Mock data for demo
      setDocuments([
        {
          _id: '67762b1a8c9d4e5f6789abc1',
          filename: 'project-requirements.pdf',
          originalName: '项目需求文档.pdf',
          fileType: 'pdf',
          fileSize: 1024000,
          uploadDate: '2024-12-20T10:00:00Z',
          analysis: {
            isAnalyzed: true,
            summary: '这是一个关于智能工作助手的项目需求文档，详细描述了系统的核心功能模块，包括任务管理、文档分析、会议处理等五大主要功能。',
            keyPoints: [
              '系统需要支持任务规划功能，为用户提供多种方案建议',
              '文档分析模块需要自动提取关键信息',
              '会议音频处理要支持转录和行动项生成',
              '需要集成微信公众号接口',
              '要求支持多平台日程同步'
            ],
            category: '需求文档',
            sentiment: 'positive' as const,
            entities: ['任务管理', '文档分析', '会议处理', '微信集成', '日程同步'],
            analyzedAt: '2024-12-20T10:30:00Z'
          },
          tags: ['项目', '需求', '重要'],
          projectId: 'proj-001',
          uploadedBy: user?.username || '张三',
        },
        {
          _id: '67762b2b8c9d4e5f6789abc2',
          filename: 'market-research.docx',
          originalName: '市场调研报告.docx',
          fileType: 'docx',
          fileSize: 2048000,
          uploadDate: '2024-12-19T14:00:00Z',
          analysis: {
            isAnalyzed: true,
            summary: '市场调研报告显示，智能工作助手类产品市场需求持续增长，用户主要关注效率提升和自动化功能。',
            keyPoints: [
              '市场规模预计年增长率为25%',
              '用户最关心的是任务自动化功能',
              '微信集成是用户高频需求',
              '竞争对手主要集中在企业级市场',
              '个人用户市场仍有很大空间'
            ],
            category: '市场调研',
            sentiment: 'positive' as const,
            entities: ['市场调研', '用户需求', '竞争分析'],
            analyzedAt: '2024-12-19T15:00:00Z'
          },
          tags: ['市场', '调研', '分析'],
          uploadedBy: user?.username || '李四',
        },
        {
          _id: '67762b3c8c9d4e5f6789abc3',
          filename: 'technical-spec.md',
          originalName: '技术规格说明.md',
          fileType: 'md',
          fileSize: 512000,
          uploadDate: '2024-12-21T09:00:00Z',
          analysis: null,
          tags: ['技术', '规格'],
          uploadedBy: user?.username || '王五',
        }
      ]);
    }
    setLoading(false);
  }, [api, user?.username]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);



  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploadLoading(true);
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('documents', file);
    });

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        await loadDocuments();
        alert(`成功上传 ${files.length} 个文档`);
      }
    } catch (error) {
      console.error('Failed to upload documents:', error);
      // For demo, simulate upload
      Array.from(files).forEach((file, index) => {
        const newDoc: Document = {
          _id: new Date().getTime().toString(16) + Math.random().toString(16).substr(2, 8),
          filename: `${Date.now()}-${file.name}`,
          originalName: file.name,
          fileType: file.name.split('.').pop() || 'unknown',
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          analysis: null,
          tags: [],
          uploadedBy: user?.username || 'unknown',
        };
        setDocuments(prev => [newDoc, ...(prev || [])]);
      });
      alert(`成功上传 ${files.length} 个文档（演示模式）`);
    }
    setUploadLoading(false);
  };

  const handleAnalyzeDocument = async (docId: string) => {
    setAnalysisLoading(docId);
    try {
      const response = await api.post(`/documents/${docId}/analyze`);
      if (response.data.success) {
        setDocuments(prev => (prev || []).map(doc => 
          doc._id === docId 
            ? { ...doc, analysis: response.data.analysis }
            : doc
        ));
      }
    } catch (error) {
      console.error('Failed to analyze document:', error);
      // For demo, simulate analysis
      const mockAnalysis = {
        isAnalyzed: true,
        summary: '这是一个通过AI分析生成的文档摘要，包含了文档的主要内容和关键信息点。',
        keyPoints: [
          '文档包含重要的业务信息',
          '涉及多个关键技术要点',
          '提供了详细的实施方案',
          '包含了时间计划和资源分配'
        ],
        category: '分析报告',
        sentiment: 'neutral' as const,
        entities: ['业务', '技术', '方案', '计划'],
        analyzedAt: new Date().toISOString()
      };
      
      setDocuments(prev => (prev || []).map(doc => 
        doc._id === docId 
          ? { ...doc, analysis: mockAnalysis }
          : doc
      ));
    }
    setAnalysisLoading(null);
  };

  const handleDownloadDocument = async (docId: string, filename: string) => {
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('文档下载失败');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('确定要删除这个文档吗？')) return;

    try {
      await api.delete(`/documents/${docId}`);
      setDocuments(prev => (prev || []).filter(doc => doc._id !== docId));
      alert('文档删除成功');
    } catch (error) {
      console.error('Failed to delete document:', error);
      // For demo, remove locally
      setDocuments(prev => (prev || []).filter(doc => doc._id !== docId));
      alert('文档删除成功（演示模式）');
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return <PictureAsPdf sx={{ color: 'error.main' }} />;
      case 'docx':
      case 'doc': return <Description sx={{ color: 'primary.main' }} />;
      case 'xlsx':
      case 'xls': return <TableChart sx={{ color: 'success.main' }} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif': return <Image sx={{ color: 'warning.main' }} />;
      case 'md': return <Article sx={{ color: 'info.main' }} />;
      default: return <Folder sx={{ color: 'text.secondary' }} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'info';
    }
  };

  const getSentimentLabel = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return '积极';
      case 'negative': return '消极';
      default: return '中性';
    }
  };

  const filteredDocuments = (documents || []).filter(doc => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !filterCategory || doc.analysis?.category === filterCategory;
    const matchesTab = activeTab === 0 || 
                      (activeTab === 1 && doc.analysis?.isAnalyzed) ||
                      (activeTab === 2 && !doc.analysis?.isAnalyzed);
    return matchesSearch && matchesCategory && matchesTab;
  });

  const categories = Array.from(new Set(
    (documents || [])
      .filter(doc => doc.analysis?.category)
      .map(doc => doc.analysis!.category)
  ));

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载文档数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          文档管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDocuments}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
          >
            {uploadLoading ? <CircularProgress size={20} /> : '上传文档'}
          </Button>
        </Box>
      </Box>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.xls,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Description sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4">{documents?.length || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                总文档数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Analytics sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4">
                {(documents || []).filter(doc => doc.analysis?.isAnalyzed).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已分析文档
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CloudUpload sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">
                {(documents || []).filter(doc => new Date(doc.uploadDate) > new Date(Date.now() - 7*24*60*60*1000)).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                本周上传
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Folder sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">{categories.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                文档类别
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="搜索文档..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>文档类别</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="文档类别"
                  startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary' }} />}
                >
                  <MenuItem value="">全部类别</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label={`全部 (${(documents || []).length})`} />
                <Tab label={`已分析 (${(documents || []).filter(doc => doc.analysis?.isAnalyzed).length})`} />
                <Tab label={`待分析 (${(documents || []).filter(doc => !doc.analysis?.isAnalyzed).length})`} />
              </Tabs>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Document List */}
      <Grid container spacing={3}>
        {filteredDocuments.map((doc) => (
          <Grid item xs={12} key={doc._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Avatar sx={{ mr: 2, mt: 0.5 }}>
                    {getFileIcon(doc.fileType)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {doc.originalName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                      <Chip label={doc.fileType.toUpperCase()} size="small" />
                      <Chip label={formatFileSize(doc.fileSize)} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">
                        上传: {new Date(doc.uploadDate).toLocaleDateString('zh-CN')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        上传者: {doc.uploadedBy}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(doc.tags || []).map(tag => (
                        <Chip key={tag} label={tag} size="small" color="secondary" />
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setDetailsOpen(true);
                      }}
                    >
                      详情
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Download />}
                      onClick={() => handleDownloadDocument(doc._id, doc.originalName)}
                    >
                      下载
                    </Button>
                    {!doc.analysis?.isAnalyzed && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={analysisLoading === doc._id ? <CircularProgress size={16} /> : <Analytics />}
                        onClick={() => handleAnalyzeDocument(doc._id)}
                        disabled={analysisLoading === doc._id}
                      >
                        分析
                      </Button>
                    )}
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteDocument(doc._id)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>

                {/* Analysis Results */}
                {doc.analysis?.isAnalyzed && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="subtitle2">分析结果</Typography>
                        <Chip 
                          label={doc.analysis.category} 
                          size="small" 
                          color="primary" 
                        />
                        <Chip
                          label={getSentimentLabel(doc.analysis.sentiment)}
                          size="small"
                          color={getSentimentColor(doc.analysis.sentiment)}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          分析时间: {new Date(doc.analysis.analyzedAt).toLocaleString('zh-CN')}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>
                            文档摘要:
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            {doc.analysis.summary}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            关键要点:
                          </Typography>
                          <List dense>
                            {doc.analysis.keyPoints.map((point, index) => (
                              <ListItem key={index}>
                                <ListItemText
                                  primary={`• ${point}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            实体标签:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {doc.analysis.entities.map(entity => (
                              <Chip key={entity} label={entity} size="small" color="info" />
                            ))}
                          </Box>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {filteredDocuments.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">
              {searchQuery || filterCategory ? '没有找到符合条件的文档' : '暂无文档数据'}
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Document Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          文档详情 - {selectedDoc?.originalName}
        </DialogTitle>
        <DialogContent>
          {selectedDoc && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>基本信息</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">文件名</Typography>
                      <Typography variant="body1">{selectedDoc.originalName}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">文件类型</Typography>
                      <Typography variant="body1">{selectedDoc.fileType.toUpperCase()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">文件大小</Typography>
                      <Typography variant="body1">{formatFileSize(selectedDoc.fileSize)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">上传时间</Typography>
                      <Typography variant="body1">
                        {new Date(selectedDoc.uploadDate).toLocaleString('zh-CN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">上传者</Typography>
                      <Typography variant="body1">{selectedDoc.uploadedBy}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">标签</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {selectedDoc.tags.length > 0 ? selectedDoc.tags.map(tag => (
                          <Chip key={tag} label={tag} size="small" />
                        )) : (
                          <Typography variant="caption" color="text.secondary">暂无标签</Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              {selectedDoc.analysis?.isAnalyzed && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>分析结果</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>摘要</Typography>
                        <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                          {selectedDoc.analysis.summary}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>关键要点</Typography>
                        <List dense>
                          {selectedDoc.analysis.keyPoints.map((point, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={`• ${point}`} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" gutterBottom>类别</Typography>
                        <Chip label={selectedDoc.analysis.category} color="primary" />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" gutterBottom>情感倾向</Typography>
                        <Chip 
                          label={getSentimentLabel(selectedDoc.analysis.sentiment)} 
                          color={getSentimentColor(selectedDoc.analysis.sentiment)} 
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2" gutterBottom>分析时间</Typography>
                        <Typography variant="body2">
                          {new Date(selectedDoc.analysis.analyzedAt).toLocaleString('zh-CN')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>实体标签</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {selectedDoc.analysis.entities.map(entity => (
                            <Chip key={entity} label={entity} size="small" color="info" />
                          ))}
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>关闭</Button>
          {selectedDoc && (
            <Button 
              variant="contained"
              startIcon={<Download />}
              onClick={() => {
                handleDownloadDocument(selectedDoc._id, selectedDoc.originalName);
                setDetailsOpen(false);
              }}
            >
              下载文档
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="upload document"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Documents;