import React, { useState, useEffect, useRef } from 'react';
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
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CustomGrid from '../../components/common/CustomGrid';
const Grid = CustomGrid;
import {
  Add,
  Upload,
  Mic,
  VideoCall,
  PlayArrow,
  Pause,
  Stop,
  Download,
  Visibility,
  ExpandMore,
  Refresh,
  Search,
  Assignment,
  Transcribe,
  Psychology,
  Person,
  CalendarToday,
  AccessTime,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';

interface Meeting {
  _id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  attendees: string[];
  audioFile: {
    filename: string;
    originalName: string;
    fileSize: number;
    duration: number;
  } | null;
  transcript: {
    isProcessed: boolean;
    content: string;
    speakers: Array<{
      speaker: string;
      segments: Array<{
        text: string;
        startTime: number;
        endTime: number;
      }>;
    }>;
    processedAt: string;
  } | null;
  actionItems: Array<{
    content: string;
    assignee: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  summary: string;
  keyPoints: string[];
  createdBy: string;
  createdAt: string;
}

interface MeetingFormData {
  title: string;
  description: string;
  date: string;
  attendees: string;
}

const Meetings: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    attendees: '',
  });

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      // Mock data for demo
      setMeetings([
        {
          _id: '1',
          title: '团队周例会',
          description: '讨论本周工作进展和下周计划',
          date: '2024-12-23',
          duration: 60,
          attendees: ['张三', '李四', '王五', user?.username || '当前用户'],
          audioFile: {
            filename: 'weekly-meeting-20241223.mp3',
            originalName: '周例会录音.mp3',
            fileSize: 15728640, // ~15MB
            duration: 3600, // 60 minutes
          },
          transcript: {
            isProcessed: true,
            content: '会议开始。张三：大家好，今天我们来讨论本周的工作进展...',
            speakers: [
              {
                speaker: '张三',
                segments: [
                  { text: '大家好，今天我们来讨论本周的工作进展', startTime: 0, endTime: 5 },
                  { text: '首先，我来汇报一下产品开发的情况', startTime: 10, endTime: 15 }
                ]
              },
              {
                speaker: '李四',
                segments: [
                  { text: '我这边UI设计已经完成了80%', startTime: 20, endTime: 25 },
                  { text: '预计明天可以全部完成', startTime: 26, endTime: 30 }
                ]
              }
            ],
            processedAt: '2024-12-23T11:00:00Z'
          },
          actionItems: [
            {
              content: '完成UI设计稿的最终版本',
              assignee: '李四',
              priority: 'high',
              dueDate: '2024-12-24',
              status: 'in_progress'
            },
            {
              content: '准备产品演示PPT',
              assignee: '王五',
              priority: 'medium',
              dueDate: '2024-12-25',
              status: 'pending'
            },
            {
              content: '安排客户演示时间',
              assignee: '张三',
              priority: 'high',
              dueDate: '2024-12-24',
              status: 'completed'
            }
          ],
          summary: '本次会议主要讨论了产品开发进展，UI设计即将完成，需要准备客户演示相关工作。团队整体进度良好，按计划推进。',
          keyPoints: [
            'UI设计进度80%，明天完成',
            '需要准备客户演示PPT',
            '客户演示时间已确定',
            '下周开始集成测试'
          ],
          createdBy: user?.username || '张三',
          createdAt: '2024-12-23T10:00:00Z'
        },
        {
          _id: '2',
          title: '客户需求讨论',
          description: '与客户A讨论新功能需求',
          date: '2024-12-22',
          duration: 90,
          attendees: ['张三', '客户A'],
          audioFile: {
            filename: 'client-discussion-20241222.mp3',
            originalName: '客户讨论录音.mp3',
            fileSize: 23592960, // ~23MB
            duration: 5400, // 90 minutes
          },
          transcript: null,
          actionItems: [],
          summary: '',
          keyPoints: [],
          createdBy: user?.username || '张三',
          createdAt: '2024-12-22T14:00:00Z'
        }
      ]);
    }
    setLoading(false);
  };

  const handleAudioUpload = async (files: FileList, meetingId?: string) => {
    if (!files.length) return;
    
    const audioFile = files[0];
    if (!audioFile.type.startsWith('audio/')) {
      alert('请选择音频文件');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    if (meetingId) {
      formData.append('meetingId', meetingId);
    }

    try {
      const response = await api.post('/meetings/upload-audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        await loadMeetings();
        alert('音频上传成功');
      }
    } catch (error) {
      console.error('Failed to upload audio:', error);
      alert('音频上传失败');
    }
    setUploadLoading(false);
  };

  const handleProcessAudio = async (meetingId: string) => {
    setProcessingId(meetingId);
    try {
      const response = await api.post(`/meetings/${meetingId}/process`);
      if (response.data.success) {
        await loadMeetings();
        alert('音频处理完成');
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      // For demo, simulate processing
      setTimeout(() => {
        setMeetings(prev => prev.map(meeting => 
          meeting._id === meetingId ? {
            ...meeting,
            transcript: {
              isProcessed: true,
              content: '这是一个AI生成的会议转录示例...',
              speakers: [
                {
                  speaker: '发言人1',
                  segments: [
                    { text: '会议开始，欢迎大家参加', startTime: 0, endTime: 5 }
                  ]
                }
              ],
              processedAt: new Date().toISOString()
            },
            actionItems: [
              {
                content: 'AI生成的行动项示例',
                assignee: user?.username || '待分配',
                priority: 'medium',
                dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
                status: 'pending'
              }
            ],
            summary: '这是AI生成的会议摘要示例，包含了会议的主要内容和结论。',
            keyPoints: ['关键点1', '关键点2', '关键点3']
          } : meeting
        ));
        setProcessingId(null);
        alert('音频处理完成（演示模式）');
      }, 3000);
    }
  };

  const handleCreateMeeting = async () => {
    try {
      const meetingData = {
        ...formData,
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
      };
      
      const response = await api.post('/meetings', meetingData);
      if (response.data.success) {
        await loadMeetings();
        setCreateOpen(false);
        resetForm();
        alert('会议创建成功');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      // For demo, add meeting locally
      const newMeeting: Meeting = {
        _id: Date.now().toString(),
        ...formData,
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
        duration: 0,
        audioFile: null,
        transcript: null,
        actionItems: [],
        summary: '',
        keyPoints: [],
        createdBy: user?.username || 'unknown',
        createdAt: new Date().toISOString(),
      };
      setMeetings(prev => [newMeeting, ...prev]);
      setCreateOpen(false);
      resetForm();
      alert('会议创建成功（演示模式）');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      attendees: '',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  const getStatusColor = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed') => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      default: return <Warning />;
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meeting.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 0 || 
                      (activeTab === 1 && meeting.transcript?.isProcessed) ||
                      (activeTab === 2 && !meeting.transcript?.isProcessed);
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载会议数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          会议管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadMeetings}
          >
            刷新
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => audioInputRef.current?.click()}
            disabled={uploadLoading}
          >
            {uploadLoading ? <CircularProgress size={20} /> : '上传录音'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateOpen(true)}
          >
            新建会议
          </Button>
        </Box>
      </Box>

      {/* Hidden Audio Input */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files && handleAudioUpload(e.target.files)}
      />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <VideoCall sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4">{meetings.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                总会议数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Transcribe sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4">
                {meetings.filter(m => m.transcript?.isProcessed).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已转录
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">
                {meetings.reduce((sum, m) => sum + m.actionItems.length, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                行动项总数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Psychology sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">
                {meetings.filter(m => m.audioFile && !m.transcript?.isProcessed).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                待处理音频
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={6}>
              <TextField
                fullWidth
                placeholder="搜索会议..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label={`全部 (${meetings.length})`} />
                <Tab label={`已转录 (${meetings.filter(m => m.transcript?.isProcessed).length})`} />
                <Tab label={`待转录 (${meetings.filter(m => !m.transcript?.isProcessed).length})`} />
              </Tabs>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Meeting List */}
      <Grid container spacing={3}>
        {filteredMeetings.map((meeting) => (
          <Grid item xs={12} key={meeting._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {meeting.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {meeting.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption">
                          {new Date(meeting.date).toLocaleDateString('zh-CN')}
                        </Typography>
                      </Box>
                      {meeting.duration > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTime sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography variant="caption">
                            {formatDuration(meeting.duration * 60)}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption">
                          {meeting.attendees.length} 人参与
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {meeting.attendees.map(attendee => (
                        <Chip key={attendee} label={attendee} size="small" />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {meeting.audioFile && (
                        <Chip 
                          icon={<Mic />}
                          label="有录音"
                          color="primary"
                          size="small"
                        />
                      )}
                      {meeting.transcript?.isProcessed ? (
                        <Chip 
                          icon={<CheckCircle />}
                          label="已转录"
                          color="success"
                          size="small"
                        />
                      ) : meeting.audioFile ? (
                        <Chip 
                          icon={<Warning />}
                          label="待转录"
                          color="warning"
                          size="small"
                        />
                      ) : null}
                      {meeting.actionItems.length > 0 && (
                        <Chip 
                          icon={<Assignment />}
                          label={`${meeting.actionItems.length} 个行动项`}
                          color="info"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setDetailsOpen(true);
                      }}
                    >
                      详情
                    </Button>
                    {meeting.audioFile && !meeting.transcript?.isProcessed && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={processingId === meeting._id ? <CircularProgress size={16} /> : <Transcribe />}
                        onClick={() => handleProcessAudio(meeting._id)}
                        disabled={processingId === meeting._id}
                      >
                        转录分析
                      </Button>
                    )}
                    {!meeting.audioFile && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Upload />}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'audio/*';
                          input.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files;
                            if (files) handleAudioUpload(files, meeting._id);
                          };
                          input.click();
                        }}
                      >
                        上传录音
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Action Items Preview */}
                {meeting.actionItems.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">
                        行动项 ({meeting.actionItems.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {meeting.actionItems.slice(0, 3).map((item, index) => (
                          <ListItem key={index}>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: `${getPriorityColor(item.priority)}.main` }}>
                                {getStatusIcon(item.status)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={item.content}
                              secondary={
                                <Box>
                                  <Typography variant="caption" component="span">
                                    负责人: {item.assignee}
                                  </Typography>
                                  {' • '}
                                  <Typography variant="caption" component="span">
                                    截止: {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                                  </Typography>
                                </Box>
                              }
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                              <Chip
                                label={
                                  item.priority === 'high' ? '高优先级' :
                                  item.priority === 'medium' ? '中优先级' : '低优先级'
                                }
                                color={getPriorityColor(item.priority)}
                                size="small"
                              />
                              <Chip
                                label={
                                  item.status === 'completed' ? '已完成' :
                                  item.status === 'in_progress' ? '进行中' : '待处理'
                                }
                                color={getStatusColor(item.status)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </ListItem>
                        ))}
                        {meeting.actionItems.length > 3 && (
                          <ListItem>
                            <ListItemText
                              primary={`还有 ${meeting.actionItems.length - 3} 个行动项...`}
                              primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                            />
                          </ListItem>
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {filteredMeetings.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">
              {searchQuery ? '没有找到符合条件的会议' : '暂无会议数据'}
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Meeting Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          会议详情 - {selectedMeeting?.title}
        </DialogTitle>
        <DialogContent>
          {selectedMeeting && (
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>基本信息</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">会议标题</Typography>
                      <Typography variant="body1">{selectedMeeting.title}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">会议描述</Typography>
                      <Typography variant="body1">{selectedMeeting.description}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">会议日期</Typography>
                      <Typography variant="body1">
                        {new Date(selectedMeeting.date).toLocaleDateString('zh-CN')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">会议时长</Typography>
                      <Typography variant="body1">
                        {selectedMeeting.duration > 0 ? formatDuration(selectedMeeting.duration * 60) : '未设定'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">参与人员</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {selectedMeeting.attendees.map(attendee => (
                          <Chip key={attendee} label={attendee} size="small" />
                        ))}
                      </Box>
                    </Grid>
                    {selectedMeeting.audioFile && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">音频文件</Typography>
                        <Typography variant="body1">
                          {selectedMeeting.audioFile.originalName} ({formatFileSize(selectedMeeting.audioFile.fileSize)})
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* Summary and Key Points */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>会议总结</Typography>
                  {selectedMeeting.summary ? (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {selectedMeeting.summary}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>关键要点:</Typography>
                      <List dense>
                        {selectedMeeting.keyPoints.map((point, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={`• ${point}`} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  ) : (
                    <Alert severity="info">暂无会议总结</Alert>
                  )}
                </Paper>
              </Grid>

              {/* Transcript */}
              {selectedMeeting.transcript?.isProcessed && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>会议转录</Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {selectedMeeting.transcript.speakers.map((speaker, index) => (
                        <Box key={index} sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary">
                            {speaker.speaker}:
                          </Typography>
                          {speaker.segments.map((segment, segIndex) => (
                            <Typography key={segIndex} variant="body2" sx={{ ml: 2, mb: 1 }}>
                              [{Math.floor(segment.startTime / 60)}:{(segment.startTime % 60).toString().padStart(2, '0')}] {segment.text}
                            </Typography>
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* Action Items */}
              {selectedMeeting.actionItems.length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>行动项</Typography>
                    <List>
                      {selectedMeeting.actionItems.map((item, index) => (
                        <React.Fragment key={index}>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: `${getPriorityColor(item.priority)}.main` }}>
                                {getStatusIcon(item.status)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={item.content}
                              secondary={
                                <Box>
                                  <Typography variant="caption" component="span">
                                    负责人: {item.assignee}
                                  </Typography>
                                  {' • '}
                                  <Typography variant="caption" component="span">
                                    截止: {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                                  </Typography>
                                </Box>
                              }
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <Chip
                                label={
                                  item.priority === 'high' ? '高' :
                                  item.priority === 'medium' ? '中' : '低'
                                }
                                color={getPriorityColor(item.priority)}
                                size="small"
                              />
                              <Chip
                                label={
                                  item.status === 'completed' ? '已完成' :
                                  item.status === 'in_progress' ? '进行中' : '待处理'
                                }
                                color={getStatusColor(item.status)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </ListItem>
                          {index < selectedMeeting.actionItems.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建新会议</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="会议标题"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="会议描述"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="会议日期"
                InputLabelProps={{ shrink: true }}
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="参与人员（用逗号分隔）"
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                placeholder="张三, 李四, 王五"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button onClick={handleCreateMeeting} variant="contained">创建</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add meeting"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Meetings;