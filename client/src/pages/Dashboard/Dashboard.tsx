import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Assignment,
  CalendarToday,
  Description,
  VideoCall,
  Chat,
  TrendingUp,
  Add,
  CheckCircle,
  Schedule,
  Warning,
  Refresh,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';
import { useNavigate } from 'react-router-dom';
import CustomGrid from '../../components/common/CustomGrid';
const Grid = CustomGrid;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
    calendar: { todayEvents: 0, thisWeekEvents: 0, upcomingEvents: [] },
    documents: { total: 0, analyzed: 0, recent: [] },
    meetings: { total: 0, processed: 0, recent: [] },
    wechat: { isBindined: false, nickname: '', lastActivity: null },
  });

  // Mock data for charts
  const weeklyTasksData = [
    { day: '周一', completed: 4, created: 6 },
    { day: '周二', completed: 3, created: 4 },
    { day: '周三', completed: 8, created: 9 },
    { day: '周四', completed: 5, created: 7 },
    { day: '周五', completed: 6, created: 8 },
    { day: '周六', completed: 2, created: 3 },
    { day: '周日', completed: 1, created: 2 },
  ];

  const taskDistributionData = [
    { name: '已完成', value: 45, color: '#4caf50' },
    { name: '进行中', value: 30, color: '#2196f3' },
    { name: '待开始', value: 20, color: '#ff9800' },
    { name: '已逾期', value: 5, color: '#f44336' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - replace with actual API calls when backend is ready
      setTimeout(() => {
        setDashboardData({
          tasks: { total: 24, completed: 18, pending: 4, overdue: 2 },
          calendar: { 
            todayEvents: 3, 
            thisWeekEvents: 12,
            upcomingEvents: [
              { id: 1, title: '项目评审会议', time: '14:00', type: 'meeting' },
              { id: 2, title: '客户拜访', time: '16:30', type: 'appointment' },
            ]
          },
          documents: { 
            total: 15, 
            analyzed: 12,
            recent: [
              { id: 1, title: '项目需求文档.pdf', analyzedAt: '2小时前', status: 'analyzed' },
              { id: 2, title: '市场调研报告.docx', analyzedAt: '1天前', status: 'analyzed' },
            ]
          },
          meetings: { 
            total: 8, 
            processed: 6,
            recent: [
              { id: 1, title: '周例会', processedAt: '昨天', actionItems: 5 },
              { id: 2, title: '产品讨论', processedAt: '2天前', actionItems: 3 },
            ]
          },
          wechat: { 
            isBindined: user?.wechatBinding?.isVerified || false, 
            nickname: user?.wechatBinding?.nickname || '',
            lastActivity: '1小时前'
          },
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载仪表板数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Welcome Section */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Grid container alignItems="center">
            <Grid item xs={12} sm={8}>
              <Typography variant="h4" gutterBottom>
                欢迎回来，{user?.profile.fullName || user?.username}！
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long' 
                })}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`职位: ${user?.profile.position}`} 
                  variant="outlined" 
                  sx={{ color: 'white', borderColor: 'white' }} 
                />
                {dashboardData.wechat.isBindined && (
                  <Chip 
                    label="微信已绑定" 
                    variant="outlined" 
                    sx={{ color: 'white', borderColor: 'white' }} 
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
              <Avatar
                src={user?.profile.avatar}
                sx={{ 
                  width: 80, 
                  height: 80, 
                  margin: { xs: '16px auto 0', sm: '0 0 0 auto' },
                  bgcolor: 'rgba(255,255,255,0.2)'
                }}
              >
                {user?.profile.fullName?.[0] || user?.username?.[0]}
              </Avatar>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">任务管理</Typography>
              </Box>
              <Typography variant="h4" color="primary">
                {dashboardData.tasks.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                总任务数
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(dashboardData.tasks.completed / dashboardData.tasks.total) * 100}
                sx={{ mt: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">
                  已完成 {dashboardData.tasks.completed}
                </Typography>
                <Typography variant="caption" color="error">
                  逾期 {dashboardData.tasks.overdue}
                </Typography>
              </Box>
              <Button 
                size="small" 
                startIcon={<Add />} 
                sx={{ mt: 1 }}
                onClick={() => navigate('/tasks')}
              >
                查看任务
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarToday color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">日程安排</Typography>
              </Box>
              <Typography variant="h4" color="secondary">
                {dashboardData.calendar.todayEvents}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                今日事件
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                本周共 {dashboardData.calendar.thisWeekEvents} 个事件
              </Typography>
              <Button 
                size="small" 
                startIcon={<CalendarToday />} 
                sx={{ mt: 1 }}
                onClick={() => navigate('/calendar')}
              >
                查看日历
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Description color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">文档分析</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {dashboardData.documents.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                文档总数
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                已分析 {dashboardData.documents.analyzed} 个
              </Typography>
              <Button 
                size="small" 
                startIcon={<Description />} 
                sx={{ mt: 1 }}
                onClick={() => navigate('/documents')}
              >
                查看文档
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chat color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">微信助手</Typography>
              </Box>
              {dashboardData.wechat.isBindined ? (
                <>
                  <Typography variant="h4" color="info.main">
                    已绑定
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.wechat.nickname}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    最后活跃: {dashboardData.wechat.lastActivity}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h4" color="warning.main">
                    未绑定
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    绑定微信享受更多功能
                  </Typography>
                </>
              )}
              <Button 
                size="small" 
                startIcon={<Chat />} 
                sx={{ mt: 1 }}
                onClick={() => navigate('/wechat')}
              >
                微信设置
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Tasks Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">任务完成趋势</Typography>
                <IconButton onClick={loadDashboardData}>
                  <Refresh />
                </IconButton>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTasksData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" stroke="#2196f3" strokeWidth={2} />
                  <Line type="monotone" dataKey="created" stroke="#ff9800" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Task Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                任务状态分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {taskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                今日日程
              </Typography>
              <List>
                {dashboardData.calendar.upcomingEvents.map((event, index) => (
                  <ListItem key={event.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <Schedule />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={event.title}
                      secondary={`${event.time} - ${event.type}`}
                    />
                  </ListItem>
                ))}
                {dashboardData.calendar.upcomingEvents.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    今日暂无安排
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                最近文档
              </Typography>
              <List>
                {dashboardData.documents.recent.map((doc, index) => (
                  <ListItem key={doc.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <Description />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={doc.title}
                      secondary={`分析时间: ${doc.analyzedAt}`}
                    />
                    <Chip 
                      label={doc.status === 'analyzed' ? '已分析' : '处理中'} 
                      color={doc.status === 'analyzed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;