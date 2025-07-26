import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  // QRCode - not available in MUI
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import CustomGrid from '../../components/common/CustomGrid';
const Grid = CustomGrid;
import {
  Chat,
  QrCode,
  Link,
  LinkOff,
  Refresh,
  Settings,
  Send,
  Message,
  Person,
  AccessTime,
  CheckCircle,
  Warning,
  SmartToy,
  ExpandMore,
  ContentCopy,
  Sync,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';

interface WeChatBinding {
  isVerified: boolean;
  nickname: string;
  openid: string;
  bindTime: string;
  lastActivity: string;
}

interface MessageLog {
  _id: string;
  type: 'received' | 'sent';
  content: string;
  messageType: 'text' | 'voice' | 'image';
  timestamp: string;
  processed: boolean;
  response?: string;
}

interface BindingCode {
  code: string;
  expiresAt: string;
  isActive: boolean;
}

const WeChat: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [bindingCode, setBindingCode] = useState<BindingCode | null>(null);
  const [wechatBinding, setWeChatBinding] = useState<WeChatBinding | null>(null);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [bindingLoading, setBingingLoading] = useState(false);
  const [unbindingLoading, setUnbindingLoading] = useState(false);
  const [testMessageLoading, setTestMessageLoading] = useState(false);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWeChatData();
    // Auto refresh binding status every 10 seconds when binding code is active
    const interval = setInterval(() => {
      if (bindingCode?.isActive) {
        checkBindingStatus();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [bindingCode?.isActive]);

  const loadWeChatData = async () => {
    setLoading(true);
    try {
      // Load WeChat binding status
      const bindingResponse = await api.get('/wechat/binding/status');
      if (bindingResponse.data.success && bindingResponse.data.binding) {
        setWeChatBinding(bindingResponse.data.binding);
      }

      // Load message logs
      const logsResponse = await api.get('/wechat/messages');
      setMessageLogs(logsResponse.data);
    } catch (error) {
      console.error('Failed to load WeChat data:', error);
      // Mock data for demo
      if (user?.wechatBinding?.isVerified) {
        setWeChatBinding({
          isVerified: true,
          nickname: '智能助手用户',
          openid: 'mock_openid_123',
          bindTime: '2024-12-20T10:00:00Z',
          lastActivity: '2024-12-23T09:30:00Z',
        });
        setMessageLogs([
          {
            _id: '1',
            type: 'received',
            content: '帮我查看今天的任务',
            messageType: 'text',
            timestamp: '2024-12-23T09:30:00Z',
            processed: true,
            response: '您今天有3个待处理任务：\n1. 完成项目需求分析\n2. 准备周例会材料\n3. 客户需求沟通\n\n详情请访问任务管理页面查看。'
          },
          {
            _id: '2',
            type: 'received',
            content: '上传会议录音文件',
            messageType: 'voice',
            timestamp: '2024-12-23T08:45:00Z',
            processed: true,
            response: '会议录音已成功上传并处理，生成了以下行动项：\n1. 完成UI设计稿最终版本（负责人：李四）\n2. 准备产品演示PPT（负责人：王五）\n\n详情请查看会议管理页面。'
          },
          {
            _id: '3',
            type: 'received',
            content: '明天的日程安排',
            messageType: 'text',
            timestamp: '2024-12-22T16:20:00Z',
            processed: true,
            response: '明天（12月24日）您的日程安排：\n• 10:00-11:00 团队晨会\n• 14:00-15:30 客户演示\n• 16:00-17:00 项目评审\n\n请提前做好准备。'
          }
        ]);
      }
    }
    setLoading(false);
  };

  const generateBindingCode = async () => {
    setBingingLoading(true);
    try {
      const response = await api.post('/wechat/binding/generate');
      if (response.data.success) {
        setBindingCode({
          code: response.data.bindingCode,
          expiresAt: response.data.expiresAt,
          isActive: true,
        });
        setQrCodeOpen(true);
      }
    } catch (error) {
      console.error('Failed to generate binding code:', error);
      // Mock for demo
      const code = Math.random().toString().substr(2, 6);
      setBindingCode({
        code: code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        isActive: true,
      });
      setQrCodeOpen(true);
    }
    setBingingLoading(false);
  };

  const checkBindingStatus = async () => {
    if (!bindingCode?.code) return;
    
    try {
      const response = await api.get(`/wechat/binding/check/${bindingCode.code}`);
      if (response.data.success && response.data.bound) {
        setWeChatBinding(response.data.binding);
        setBindingCode(null);
        setQrCodeOpen(false);
        alert('微信账号绑定成功！');
        await loadWeChatData();
      }
    } catch (error) {
      console.error('Failed to check binding status:', error);
    }
  };

  const handleUnbind = async () => {
    if (!window.confirm('确定要解除微信绑定吗？解除后将无法通过微信使用智能助手功能。')) {
      return;
    }

    setUnbindingLoading(true);
    try {
      const response = await api.delete('/wechat/binding');
      if (response.data.success) {
        setWeChatBinding(null);
        setMessageLogs([]);
        alert('微信账号解绑成功');
      }
    } catch (error) {
      console.error('Failed to unbind WeChat:', error);
      // For demo
      setWeChatBinding(null);
      setMessageLogs([]);
      alert('微信账号解绑成功（演示模式）');
    }
    setUnbindingLoading(false);
  };

  const handleSendTestMessage = async () => {
    if (!testMessage.trim() || !wechatBinding) return;

    setTestMessageLoading(true);
    try {
      const response = await api.post('/wechat/send-message', {
        openid: wechatBinding.openid,
        message: testMessage,
      });
      
      if (response.data.success) {
        alert('测试消息发送成功');
        setTestMessage('');
        await loadWeChatData();
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      alert('测试消息发送失败');
    }
    setTestMessageLoading(false);
  };

  const handleRefreshLogs = async () => {
    setRefreshing(true);
    await loadWeChatData();
    setRefreshing(false);
  };

  const copyBindingCode = () => {
    if (bindingCode?.code) {
      navigator.clipboard.writeText(bindingCode.code);
      alert('绑定码已复制到剪贴板');
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  };

  const getMessageTypeIcon = (type: MessageLog['messageType']) => {
    switch (type) {
      case 'voice': return '🎤';
      case 'image': return '🖼️';
      default: return '💬';
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载微信数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          微信集成
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefreshLogs}
            disabled={refreshing}
          >
            {refreshing ? <CircularProgress size={20} /> : '刷新'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Binding Status */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                绑定状态
              </Typography>
              
              {wechatBinding?.isVerified ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">微信账号已绑定</Typography>
                    <Typography variant="body2">
                      您可以通过微信公众号使用智能助手的所有功能
                    </Typography>
                  </Alert>
                  
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">微信昵称</Typography>
                        <Typography variant="body1">{wechatBinding.nickname}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">绑定时间</Typography>
                        <Typography variant="body1">
                          {new Date(wechatBinding.bindTime).toLocaleString('zh-CN')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">最后活跃</Typography>
                        <Typography variant="body1">
                          {formatTimeAgo(wechatBinding.lastActivity)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">OpenID</Typography>
                        <Typography variant="body1" sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
                          {wechatBinding.openid}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<LinkOff />}
                      onClick={handleUnbind}
                      disabled={unbindingLoading}
                    >
                      {unbindingLoading ? <CircularProgress size={20} /> : '解除绑定'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">微信账号未绑定</Typography>
                    <Typography variant="body2">
                      绑定微信后，您可以通过微信公众号直接使用智能助手功能
                    </Typography>
                  </Alert>
                  
                  <Button
                    variant="contained"
                    startIcon={<Link />}
                    onClick={generateBindingCode}
                    disabled={bindingLoading}
                    fullWidth
                  >
                    {bindingLoading ? <CircularProgress size={20} /> : '生成绑定码'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Statistics */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                使用统计
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
                      <Message />
                    </Avatar>
                    <Typography variant="h4">{messageLogs.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      总消息数
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                      <SmartToy />
                    </Avatar>
                    <Typography variant="h4">
                      {messageLogs.filter(log => log.processed).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      已处理
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                      <AccessTime />
                    </Avatar>
                    <Typography variant="h4">
                      {messageLogs.filter(log => 
                        new Date(log.timestamp) > new Date(Date.now() - 24*60*60*1000)
                      ).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      今日消息
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* WeChat Features Guide */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                微信功能指南
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">📋 任务管理</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        通过微信您可以：
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="• 发送「查看任务」获取待办事项" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 发送「安排任务：[任务描述]」创建新任务" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 发送「完成任务：[任务ID]」标记完成" />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">📅 日程管理</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        日程相关功能：
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="• 发送「今日日程」查看今天安排" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 发送「明天日程」查看明日安排" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 发送「添加事件：[事件描述]」创建日程" />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">📄 文档分析</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        文档处理功能：
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="• 直接发送文档文件进行AI分析" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 发送「文档摘要」获取最新分析结果" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 支持PDF、Word、Excel等格式" />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">🎤 会议助手</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" paragraph>
                        会议相关功能：
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText primary="• 发送语音消息进行会议录音转录" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 自动生成个性化行动清单" />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="• 发送「会议总结」获取最新分析" />
                        </ListItem>
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Message Logs */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  消息记录
                </Typography>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={handleRefreshLogs}
                  disabled={refreshing}
                >
                  刷新
                </Button>
              </Box>
              
              {messageLogs.length > 0 ? (
                <List>
                  {messageLogs.slice(0, 10).map((log, index) => (
                    <React.Fragment key={log._id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: log.type === 'received' ? 'primary.main' : 'success.main' }}>
                            {log.type === 'received' ? <Person /> : <SmartToy />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle2">
                                {log.type === 'received' ? '用户消息' : 'AI回复'}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                                {getMessageTypeIcon(log.messageType)}
                              </Typography>
                              <Chip
                                label={log.messageType === 'text' ? '文字' : log.messageType === 'voice' ? '语音' : '图片'}
                                size="small"
                                color={log.messageType === 'text' ? 'default' : log.messageType === 'voice' ? 'primary' : 'secondary'}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(log.timestamp)}
                              </Typography>
                              {log.processed && (
                                <Chip
                                  icon={<CheckCircle />}
                                  label="已处理"
                                  size="small"
                                  color="success"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {log.content}
                              </Typography>
                              {log.response && (
                                <Paper sx={{ p: 1.5, bgcolor: 'action.hover', mt: 1 }}>
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    AI助手回复：
                                  </Typography>
                                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                    {log.response}
                                  </Typography>
                                </Paper>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < messageLogs.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {messageLogs.length > 10 && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                            还有 {messageLogs.length - 10} 条历史消息...
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Alert severity="info">
                  {wechatBinding?.isVerified ? '暂无消息记录' : '绑定微信后即可查看消息记录'}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Test Message (Only show when bound) */}
        {wechatBinding?.isVerified && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  测试消息
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      placeholder="输入测试消息内容..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Send />}
                      onClick={handleSendTestMessage}
                      disabled={!testMessage.trim() || testMessageLoading}
                    >
                      {testMessageLoading ? <CircularProgress size={20} /> : '发送测试消息'}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Binding QR Code Dialog */}
      <Dialog 
        open={qrCodeOpen} 
        onClose={() => setQrCodeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          微信绑定
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {bindingCode && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  请在微信公众号中发送以下绑定码：
                </Typography>
                
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', letterSpacing: 2 }}>
                    {bindingCode.code}
                  </Typography>
                  <IconButton 
                    sx={{ color: 'inherit', mt: 1 }}
                    onClick={copyBindingCode}
                  >
                    <ContentCopy />
                  </IconButton>
                </Paper>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    1. 扫描下方二维码关注公众号
                  </Typography>
                  <Typography variant="body2">
                    2. 在公众号中发送绑定码：<strong>{bindingCode.code}</strong>
                  </Typography>
                  <Typography variant="body2">
                    3. 绑定码有效期：5分钟
                  </Typography>
                </Alert>

                {/* Mock QR Code */}
                <Paper sx={{ p: 2, display: 'inline-block' }}>
                  <Box sx={{ 
                    width: 200, 
                    height: 200, 
                    bgcolor: 'grey.100', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <QrCode sx={{ fontSize: 60, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        微信公众号二维码
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                  过期时间: {new Date(bindingCode.expiresAt).toLocaleString('zh-CN')}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrCodeOpen(false)}>关闭</Button>
          <Button onClick={generateBindingCode} variant="outlined">
            重新生成
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WeChat;