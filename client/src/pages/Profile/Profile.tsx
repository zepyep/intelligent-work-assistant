import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Chip,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Person,
  Email,
  Badge,
  Business,
  Phone,
  LocationOn,
  Security,
  Notifications,
  Language,
  Palette,
  History,
  Settings,
  PhotoCamera,
  ExpandMore,
  Key,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';
import { User } from '../../types/auth';
import CustomGrid from '../../components/common/CustomGrid';

const Grid = CustomGrid;

interface UserProfile {
  username: string;
  email: string;
  profile: {
    fullName: string;
    position: string;
    department: string;
    phone: string;
    location: string;
    avatar: string;
    bio: string;
  };
  preferences: {
    language: string;
    theme: 'light' | 'dark';
    notifications: {
      email: boolean;
      wechat: boolean;
      taskReminders: boolean;
      meetingReminders: boolean;
    };
  };
  security: {
    lastPasswordChange: string;
    twoFactorEnabled: boolean;
    loginHistory: Array<{
      timestamp: string;
      location: string;
      device: string;
      ip: string;
    }>;
  };
  createdAt: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/profile');
      setUserProfile(response.data);
      setEditForm(response.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Mock data for demo
      const mockProfile: UserProfile = {
        username: user?.username || 'user123',
        email: user?.email || 'user@example.com',
        profile: {
          fullName: user?.profile?.fullName || '张三',
          position: user?.profile?.position || '产品经理',
          department: '产品部',
          phone: '138-0000-0000',
          location: '北京市朝阳区',
          avatar: user?.profile?.avatar || '',
          bio: '专注于产品创新和用户体验设计，致力于打造优秀的智能工作产品。',
        },
        preferences: {
          language: 'zh-CN',
          theme: 'light',
          notifications: {
            email: true,
            wechat: true,
            taskReminders: true,
            meetingReminders: true,
          },
        },
        security: {
          lastPasswordChange: '2024-11-15T10:00:00Z',
          twoFactorEnabled: false,
          loginHistory: [
            {
              timestamp: '2024-12-23T09:00:00Z',
              location: '北京市',
              device: 'Chrome on Windows',
              ip: '192.168.1.100',
            },
            {
              timestamp: '2024-12-22T18:30:00Z',
              location: '北京市',
              device: 'Chrome on Windows',
              ip: '192.168.1.100',
            },
            {
              timestamp: '2024-12-22T09:15:00Z',
              location: '北京市',
              device: 'Safari on iPhone',
              ip: '192.168.1.101',
            },
          ],
        },
        createdAt: '2024-01-15T10:00:00Z',
      };
      setUserProfile(mockProfile);
      setEditForm(mockProfile);
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await api.put('/users/profile', editForm);
      if (response.data.success) {
        setUserProfile(editForm as UserProfile);
        setEditing(false);
        // Convert editForm to User type for context update
        const userUpdate = {
          id: user?.id || '',
          username: editForm.username || user?.username || '',
          email: editForm.email || user?.email || '',
          profile: editForm.profile || user?.profile,
          wechatBinding: user?.wechatBinding,
          settings: user?.settings,
        } as User;
        updateUser(userUpdate);
        alert('个人资料更新成功');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      // For demo, update locally
      setUserProfile(editForm as UserProfile);
      setEditing(false);
      const userUpdate = {
        id: user?.id || '',
        username: editForm.username || user?.username || '',
        email: editForm.email || user?.email || '',
        profile: editForm.profile || user?.profile,
        wechatBinding: user?.wechatBinding,
        settings: user?.settings,
      } as User;
      updateUser(userUpdate);
      alert('个人资料更新成功（演示模式）');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('新密码与确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('新密码长度不能少于6位');
      return;
    }

    try {
      const response = await api.post('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      if (response.data.success) {
        setPasswordDialogOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('密码修改成功');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('密码修改失败，请检查当前密码是否正确');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.success) {
        const newAvatarUrl = response.data.avatarUrl;
        setUserProfile(prev => prev ? {
          ...prev,
          profile: { ...prev.profile, avatar: newAvatarUrl }
        } : null);
        setEditForm(prev => prev ? {
          ...prev,
          profile: { ...prev.profile, avatar: newAvatarUrl }
        } : {});
        alert('头像上传成功');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('头像上传失败');
    }
  };

  const handleNotificationChange = (key: keyof UserProfile['preferences']['notifications'], value: boolean) => {
    setEditForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: {
          ...prev.preferences?.notifications,
          [key]: value,
        },
      },
    }));
  };

  const getDeviceIcon = (device: string) => {
    if (device.includes('iPhone') || device.includes('Android')) return '📱';
    if (device.includes('iPad') || device.includes('Tablet')) return '📱';
    return '💻';
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载个人资料...
        </Typography>
      </Box>
    );
  }

  if (!userProfile) {
    return (
      <Alert severity="error">
        加载个人资料失败，请刷新页面重试
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          个人资料
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {editing ? (
            <>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => {
                  setEditing(false);
                  setEditForm(userProfile);
                }}
              >
                取消
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditing(true)}
            >
              编辑资料
            </Button>
          )}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                基本信息
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Avatar
                      src={editing ? editForm.profile?.avatar : userProfile.profile.avatar}
                      sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                    >
                      {userProfile.profile.fullName?.[0]}
                    </Avatar>
                    {editing && (
                      <>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleAvatarUpload}
                        />
                        <IconButton
                          component="label"
                          htmlFor="avatar-upload"
                          sx={{
                            position: 'absolute',
                            bottom: 16,
                            right: 0,
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                          size="small"
                        >
                          <PhotoCamera />
                        </IconButton>
                      </>
                    )}
                  </Box>
                  <Typography variant="h6">
                    {userProfile.profile.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userProfile.profile.position} • {userProfile.profile.department}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="姓名"
                        value={editing ? editForm.profile?.fullName || '' : userProfile.profile.fullName}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          profile: { ...prev.profile, fullName: e.target.value }
                        }))}
                        disabled={!editing}
                        InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="用户名"
                        value={userProfile.username}
                        disabled
                        InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="邮箱"
                        value={editing ? editForm.email || '' : userProfile.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!editing}
                        type="email"
                        InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="职位"
                        value={editing ? editForm.profile?.position || '' : userProfile.profile.position}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          profile: { ...prev.profile, position: e.target.value }
                        }))}
                        disabled={!editing}
                        InputProps={{ startAdornment: <Badge sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="部门"
                        value={editing ? editForm.profile?.department || '' : userProfile.profile.department}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          profile: { ...prev.profile, department: e.target.value }
                        }))}
                        disabled={!editing}
                        InputProps={{ startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="电话"
                        value={editing ? editForm.profile?.phone || '' : userProfile.profile.phone}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          profile: { ...prev.profile, phone: e.target.value }
                        }))}
                        disabled={!editing}
                        InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="地址"
                        value={editing ? editForm.profile?.location || '' : userProfile.profile.location}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          profile: { ...prev.profile, location: e.target.value }
                        }))}
                        disabled={!editing}
                        InputProps={{ startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} /> }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="个人简介"
                        multiline
                        rows={3}
                        value={editing ? editForm.profile?.bio || '' : userProfile.profile.bio}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          profile: { ...prev.profile, bio: e.target.value }
                        }))}
                        disabled={!editing}
                        placeholder="介绍一下您自己..."
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Statistics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                账号统计
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="注册时间"
                    secondary={new Date(userProfile.createdAt).toLocaleDateString('zh-CN')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="最后密码更改"
                    secondary={new Date(userProfile.security.lastPasswordChange).toLocaleDateString('zh-CN')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="两步验证"
                    secondary={
                      <Chip
                        label={userProfile.security.twoFactorEnabled ? '已启用' : '未启用'}
                        color={userProfile.security.twoFactorEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="登录历史"
                    secondary={`最近 ${userProfile.security.loginHistory.length} 次登录记录`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                偏好设置
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>语言</InputLabel>
                    <Select
                      value={editing ? editForm.preferences?.language || 'zh-CN' : userProfile.preferences.language}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, language: e.target.value }
                      }))}
                      disabled={!editing}
                      label="语言"
                      startAdornment={<Language sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="zh-CN">中文（简体）</MenuItem>
                      <MenuItem value="zh-TW">中文（繁体）</MenuItem>
                      <MenuItem value="en-US">English</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>主题</InputLabel>
                    <Select
                      value={editing ? editForm.preferences?.theme || 'light' : userProfile.preferences.theme}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, theme: e.target.value as 'light' | 'dark' }
                      }))}
                      disabled={!editing}
                      label="主题"
                      startAdornment={<Palette sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="light">浅色主题</MenuItem>
                      <MenuItem value="dark">深色主题</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
                通知设置
              </Typography>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Email />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="邮件通知"
                    secondary="接收重要更新和提醒邮件"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      variant={editing && editForm.preferences?.notifications?.email ? 'contained' : 'outlined'}
                      onClick={() => editing && handleNotificationChange('email', !editForm.preferences?.notifications?.email)}
                      disabled={!editing}
                    >
                      {(editing ? editForm.preferences?.notifications?.email : userProfile.preferences.notifications.email) ? '开启' : '关闭'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <Notifications />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="微信通知"
                    secondary="通过微信接收实时通知"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      variant={editing && editForm.preferences?.notifications?.wechat ? 'contained' : 'outlined'}
                      onClick={() => editing && handleNotificationChange('wechat', !editForm.preferences?.notifications?.wechat)}
                      disabled={!editing}
                    >
                      {(editing ? editForm.preferences?.notifications?.wechat : userProfile.preferences.notifications.wechat) ? '开启' : '关闭'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <Settings />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="任务提醒"
                    secondary="任务截止前的提醒通知"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      variant={editing && editForm.preferences?.notifications?.taskReminders ? 'contained' : 'outlined'}
                      onClick={() => editing && handleNotificationChange('taskReminders', !editForm.preferences?.notifications?.taskReminders)}
                      disabled={!editing}
                    >
                      {(editing ? editForm.preferences?.notifications?.taskReminders : userProfile.preferences.notifications.taskReminders) ? '开启' : '关闭'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <Settings />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="会议提醒"
                    secondary="会议开始前的提醒通知"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      variant={editing && editForm.preferences?.notifications?.meetingReminders ? 'contained' : 'outlined'}
                      onClick={() => editing && handleNotificationChange('meetingReminders', !editForm.preferences?.notifications?.meetingReminders)}
                      disabled={!editing}
                    >
                      {(editing ? editForm.preferences?.notifications?.meetingReminders : userProfile.preferences.notifications.meetingReminders) ? '开启' : '关闭'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                安全设置
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <Key />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="修改密码"
                    secondary={`上次修改: ${new Date(userProfile.security.lastPasswordChange).toLocaleDateString('zh-CN')}`}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setPasswordDialogOpen(true)}
                    >
                      修改
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: userProfile.security.twoFactorEnabled ? 'success.main' : 'warning.main' }}>
                      <Security />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="两步验证"
                    secondary={userProfile.security.twoFactorEnabled ? '已启用，账号更安全' : '建议启用以提高账号安全性'}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      size="small"
                      variant="outlined"
                      color={userProfile.security.twoFactorEnabled ? 'error' : 'primary'}
                    >
                      {userProfile.security.twoFactorEnabled ? '关闭' : '启用'}
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Login History */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Avatar sx={{ mr: 2, bgcolor: 'info.main' }}>
                <History />
              </Avatar>
              <Box>
                <Typography variant="h6">登录历史</Typography>
                <Typography variant="body2" color="text.secondary">
                  最近 {userProfile.security.loginHistory.length} 次登录记录
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {userProfile.security.loginHistory.map((login, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography component="span">
                              {getDeviceIcon(login.device)} {login.device}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(login.timestamp).toLocaleString('zh-CN')}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              📍 {login.location} • IP: {login.ip}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < userProfile.security.loginHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>修改密码</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="当前密码"
                type={showPassword.current ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                      edge="end"
                    >
                      {showPassword.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="新密码"
                type={showPassword.new ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                helperText="密码长度至少6位"
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                      edge="end"
                    >
                      {showPassword.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="确认新密码"
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                error={passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword}
                helperText={passwordForm.confirmPassword !== '' && passwordForm.newPassword !== passwordForm.confirmPassword ? '密码不匹配' : ''}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                      edge="end"
                    >
                      {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword ||
              passwordForm.newPassword.length < 6
            }
          >
            修改密码
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;