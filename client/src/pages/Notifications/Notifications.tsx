import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  Tab,
  Tabs,
  Badge
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';

interface Notification {
  _id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  status: 'pending' | 'sent' | 'failed' | 'expired';
  channels: string[];
  scheduledFor: string;
  sentAt?: string;
  readAt?: string;
  retryCount: number;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [newNotification, setNewNotification] = useState({
    title: '',
    content: '',
    type: 'info' as const,
    channels: [] as string[],
    scheduledFor: new Date().toISOString().slice(0, 16)
  });

  const notificationTypes = [
    { value: 'info', label: '信息', color: 'info' as const },
    { value: 'warning', label: '警告', color: 'warning' as const },
    { value: 'error', label: '错误', color: 'error' as const },
    { value: 'success', label: '成功', color: 'success' as const }
  ];

  const channelOptions = [
    { value: 'web', label: '网页通知' },
    { value: 'wechat', label: '微信通知' },
    { value: 'email', label: '邮件通知' }
  ];

  const statusIcons = {
    pending: <PendingIcon color="warning" />,
    sent: <CheckCircleIcon color="success" />,
    failed: <ErrorIcon color="error" />,
    expired: <ErrorIcon color="disabled" />
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      // Ensure response.data is always an array
      const notificationData = Array.isArray(response.data) ? response.data : [];
      setNotifications(notificationData);
    } catch (error: any) {
      setError(error.response?.data?.message || '获取通知失败');
      console.error('获取通知失败:', error);
      // Set empty array on error to prevent undefined access
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    try {
      if (!newNotification.title || !newNotification.content) {
        setError('请填写标题和内容');
        return;
      }

      if (newNotification.channels.length === 0) {
        setError('请选择至少一个通知渠道');
        return;
      }

      const response = await api.post('/notifications', newNotification);
      // Ensure notifications is always an array before spreading
      const currentNotifications = Array.isArray(notifications) ? notifications : [];
      setNotifications([response.data, ...currentNotifications]);
      setCreateDialogOpen(false);
      setNewNotification({
        title: '',
        content: '',
        type: 'info',
        channels: [],
        scheduledFor: new Date().toISOString().slice(0, 16)
      });
      setError(null);
    } catch (error: any) {
      setError(error.response?.data?.message || '创建通知失败');
      console.error('创建通知失败:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!window.confirm('确定要删除这个通知吗？')) return;

    try {
      await api.delete(`/notifications/${notificationId}`);
      // Ensure notifications is always an array before filtering
      const currentNotifications = Array.isArray(notifications) ? notifications : [];
      setNotifications(currentNotifications.filter(n => n._id !== notificationId));
    } catch (error: any) {
      setError(error.response?.data?.message || '删除通知失败');
      console.error('删除通知失败:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      // Ensure notifications is always an array before mapping
      const currentNotifications = Array.isArray(notifications) ? notifications : [];
      setNotifications(currentNotifications.map(n => 
        n._id === notificationId 
          ? { ...n, readAt: new Date().toISOString() }
          : n
      ));
    } catch (error: any) {
      console.error('标记为已读失败:', error);
    }
  };

  const handleChannelChange = (channel: string) => {
    setNewNotification(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const getFilteredNotifications = () => {
    if (!notifications || !Array.isArray(notifications)) {
      return [];
    }
    
    switch (activeTab) {
      case 0: // 全部
        return notifications;
      case 1: // 未读
        return (notifications || []).filter(n => !n.readAt);
      case 2: // 待发送
        return (notifications || []).filter(n => n.status === 'pending');
      case 3: // 失败
        return (notifications || []).filter(n => n.status === 'failed');
      default:
        return notifications;
    }
  };

  const getTabCounts = () => {
    if (!notifications || !Array.isArray(notifications)) {
      return {
        all: 0,
        unread: 0,
        pending: 0,
        failed: 0
      };
    }
    
    return {
      all: notifications.length,
      unread: notifications.filter(n => !n.readAt).length,
      pending: notifications.filter(n => n.status === 'pending').length,
      failed: notifications.filter(n => n.status === 'failed').length
    };
  };

  const tabCounts = getTabCounts();
  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>加载通知中...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* 页面标题和操作 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          通知中心
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          创建通知
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 通知筛选标签 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={tabCounts.all} color="primary" showZero>
                全部通知
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={tabCounts.unread} color="error">
                未读通知
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={tabCounts.pending} color="warning">
                待发送
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={tabCounts.failed} color="error">
                发送失败
              </Badge>
            } 
          />
        </Tabs>
      </Box>

      {/* 通知列表 */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" textAlign="center" color="textSecondary">
              暂无通知
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {filteredNotifications.map((notification) => (
            <ListItem
              key={notification._id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                backgroundColor: notification.readAt ? 'background.paper' : 'action.hover'
              }}
            >
              <Box sx={{ mr: 1 }}>
                {statusIcons[notification.status]}
              </Box>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">{notification.title}</Typography>
                    <Chip
                      label={notificationTypes.find(t => t.value === notification.type)?.label}
                      color={notificationTypes.find(t => t.value === notification.type)?.color}
                      size="small"
                    />
                    {notification.channels.map(channel => (
                      <Chip
                        key={channel}
                        label={channelOptions.find(c => c.value === channel)?.label}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {notification.content.length > 100 
                        ? `${notification.content.substring(0, 100)}...`
                        : notification.content
                      }
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      预定发送: {new Date(notification.scheduledFor).toLocaleString()}
                      {notification.sentAt && ` | 已发送: ${new Date(notification.sentAt).toLocaleString()}`}
                      {notification.retryCount > 0 && ` | 重试次数: ${notification.retryCount}`}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" gap={1}>
                  <IconButton
                    onClick={() => {
                      setSelectedNotification(notification);
                      setViewDialogOpen(true);
                      if (!notification.readAt) {
                        handleMarkAsRead(notification._id);
                      }
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteNotification(notification._id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* 创建通知对话框 */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>创建新通知</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="通知标题"
            value={newNotification.title}
            onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="通知内容"
            value={newNotification.content}
            onChange={(e) => setNewNotification(prev => ({ ...prev, content: e.target.value }))}
            margin="normal"
            multiline
            rows={4}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>通知类型</InputLabel>
            <Select
              value={newNotification.type}
              onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value as any }))}
            >
              {notificationTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="发送时间"
            type="datetime-local"
            value={newNotification.scheduledFor}
            onChange={(e) => setNewNotification(prev => ({ ...prev, scheduledFor: e.target.value }))}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            通知渠道:
          </Typography>
          <FormGroup row>
            {channelOptions.map(channel => (
              <FormControlLabel
                key={channel.value}
                control={
                  <Checkbox
                    checked={newNotification.channels.includes(channel.value)}
                    onChange={() => handleChannelChange(channel.value)}
                  />
                }
                label={channel.label}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button onClick={handleCreateNotification} variant="contained">
            创建通知
          </Button>
        </DialogActions>
      </Dialog>

      {/* 查看通知对话框 */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>通知详情</DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedNotification.title}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={notificationTypes.find(t => t.value === selectedNotification.type)?.label}
                  color={notificationTypes.find(t => t.value === selectedNotification.type)?.color}
                  size="small"
                />
                <Chip
                  label={selectedNotification.status}
                  color={selectedNotification.status === 'sent' ? 'success' : 
                         selectedNotification.status === 'failed' ? 'error' : 'warning'}
                  size="small"
                />
              </Box>
              <Typography variant="body1" paragraph>
                {selectedNotification.content}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                通知渠道: {selectedNotification.channels.map(c => 
                  channelOptions.find(opt => opt.value === c)?.label
                ).join(', ')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                预定发送时间: {new Date(selectedNotification.scheduledFor).toLocaleString()}
              </Typography>
              {selectedNotification.sentAt && (
                <Typography variant="body2" color="textSecondary">
                  实际发送时间: {new Date(selectedNotification.sentAt).toLocaleString()}
                </Typography>
              )}
              {selectedNotification.retryCount > 0 && (
                <Typography variant="body2" color="textSecondary">
                  重试次数: {selectedNotification.retryCount}
                </Typography>
              )}
              <Typography variant="body2" color="textSecondary">
                创建时间: {new Date(selectedNotification.createdAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notifications;