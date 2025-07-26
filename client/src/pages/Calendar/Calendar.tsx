import React, { useState, useEffect, useCallback } from 'react';
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
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  LinearProgress,
  Paper,
  Tabs,
  Tab,
  Fab,
} from '@mui/material';
import {
  Add,
  CalendarToday,
  Event,
  VideoCall,
  Person,
  LocationOn,
  AccessTime,
  Sync,
  Download,
  Refresh,
  Today,
  ViewWeek,
  ViewModule,
  ChevronLeft,
  ChevronRight,
  Google,
} from '@mui/icons-material';

import { useApi } from '../../contexts/ApiContext';
import CustomGrid from '../../components/common/CustomGrid';
const Grid = CustomGrid;

interface CalendarEvent {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  type: 'meeting' | 'appointment' | 'reminder' | 'task';
  source: 'manual' | 'google' | 'outlook';
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: string;
}

interface EventFormData {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  attendees: string;
  type: 'meeting' | 'appointment' | 'reminder' | 'task';
}

const Calendar: React.FC = () => {
  const api = useApi();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    location: '',
    attendees: '',
    type: 'meeting',
  });

  const getViewStartDate = useCallback(() => {
    const date = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        date.setHours(0, 0, 0, 0);
        return date;
      case 'week':
        const dayOfWeek = date.getDay();
        date.setDate(date.getDate() - dayOfWeek);
        date.setHours(0, 0, 0, 0);
        return date;
      case 'month':
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
      default:
        return date;
    }
  }, [currentDate, viewMode]);

  const getViewEndDate = useCallback(() => {
    const startDate = getViewStartDate();
    const endDate = new Date(startDate);
    switch (viewMode) {
      case 'day':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'week':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
    }
    return endDate;
  }, [getViewStartDate, viewMode]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/calendar/events', {
        params: {
          start: getViewStartDate().toISOString(),
          end: getViewEndDate().toISOString(),
        }
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load events:', error);
      // Mock data for demo
      setEvents([
        {
          _id: '67762a1b8c9d4e5f6789abc1',
          title: '团队周例会',
          description: '讨论本周工作进展和下周计划',
          startTime: '2024-12-23T10:00:00Z',
          endTime: '2024-12-23T11:00:00Z',
          location: '会议室A',
          attendees: ['张三', '李四', '王五'],
          type: 'meeting' as const,
          source: 'manual' as const,
          status: 'confirmed' as const,
          createdAt: '2024-12-20T09:00:00Z',
        },
        {
          _id: '67762a2c8c9d4e5f6789abc2',
          title: '客户需求沟通',
          description: '与客户讨论新功能需求',
          startTime: '2024-12-23T14:00:00Z',
          endTime: '2024-12-23T15:30:00Z',
          location: '腾讯会议',
          attendees: ['张三', '客户A'],
          type: 'meeting' as const,
          source: 'google' as const,
          status: 'confirmed' as const,
          createdAt: '2024-12-21T08:00:00Z',
        },
        {
          _id: '67762a3d8c9d4e5f6789abc3',
          title: '项目截止日期提醒',
          description: 'Alpha版本发布',
          startTime: '2024-12-25T09:00:00Z',
          endTime: '2024-12-25T09:30:00Z',
          attendees: [],
          type: 'reminder' as const,
          source: 'manual' as const,
          status: 'confirmed' as const,
          createdAt: '2024-12-22T10:00:00Z',
        }
      ]);
    }
    setLoading(false);
  }, [api, getViewStartDate, getViewEndDate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);



  const handleSyncCalendar = async (provider: 'google' | 'outlook') => {
    setSyncLoading(true);
    try {
      const response = await api.post(`/calendar/sync/${provider}`);
      if (response.data.success) {
        await loadEvents();
        alert(`已成功同步 ${provider === 'google' ? 'Google' : 'Outlook'} 日历`);
      }
    } catch (error) {
      console.error(`Failed to sync ${provider} calendar:`, error);
      alert(`${provider === 'google' ? 'Google' : 'Outlook'} 日历同步失败`);
    }
    setSyncLoading(false);
  };

  const handleCreateEvent = async () => {
    try {
      const eventData = {
        ...formData,
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
      };
      
      const response = await api.post('/calendar/events', eventData);
      if (response.data.success) {
        await loadEvents();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      // For demo, add event locally
      const newEvent: CalendarEvent = {
        _id: `${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`.padStart(24, '0'),
        ...formData,
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
        source: 'manual',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
      setEvents(prev => [newEvent, ...prev]);
      setOpenDialog(false);
      resetForm();
    }
  };

  const handleExportCalendar = async () => {
    try {
      const response = await api.get('/calendar/export', {
        responseType: 'blob',
        params: {
          format: 'ics',
          start: getViewStartDate().toISOString(),
          end: getViewEndDate().toISOString(),
        }
      });
      
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calendar_${new Date().toISOString().split('T')[0]}.ics`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export calendar:', error);
      alert('日历导出失败');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      location: '',
      attendees: '',
      type: 'meeting',
    });
  };



  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return <VideoCall />;
      case 'appointment': return <Person />;
      case 'reminder': return <AccessTime />;
      case 'task': return <Event />;
      default: return <Event />;
    }
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return 'primary';
      case 'appointment': return 'secondary';
      case 'reminder': return 'warning';
      case 'task': return 'success';
      default: return 'default';
    }
  };

  const getSourceIcon = (source: CalendarEvent['source']) => {
    switch (source) {
      case 'google': return <Google />;
      case 'outlook': return <Event />;
      default: return <CalendarToday />;
    }
  };

  const formatDateRange = () => {
    const start = getViewStartDate();
    const end = getViewEndDate();
    
    switch (viewMode) {
      case 'day':
        return start.toLocaleDateString('zh-CN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          weekday: 'long'
        });
      case 'week':
        const weekEnd = new Date(end);
        weekEnd.setDate(weekEnd.getDate() - 1);
        return `${start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
      default:
        return '';
    }
  };

  const getTodayEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return (events || []).filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= today && eventDate < tomorrow;
    });
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return (events || [])
      .filter(event => new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载日程数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          日程管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={() => handleSyncCalendar('google')}
            disabled={syncLoading}
            size="small"
          >
            Google同步
          </Button>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={() => handleSyncCalendar('outlook')}
            disabled={syncLoading}
            size="small"
          >
            Outlook同步
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCalendar}
            size="small"
          >
            导出
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadEvents}
            size="small"
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
            size="small"
          >
            新建事件
          </Button>
        </Box>
      </Box>

      {/* View Controls */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateDate('prev')}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" sx={{ minWidth: '200px', textAlign: 'center' }}>
              {formatDateRange()}
            </Typography>
            <IconButton onClick={() => navigateDate('next')}>
              <ChevronRight />
            </IconButton>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Today />}
              onClick={() => setCurrentDate(new Date())}
              sx={{ ml: 2 }}
            >
              今天
            </Button>
          </Box>
          <Tabs
            value={viewMode}
            onChange={(e, newValue) => setViewMode(newValue)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab icon={<Today />} label="日" value="day" />
            <Tab icon={<ViewWeek />} label="周" value="week" />
            <Tab icon={<ViewModule />} label="月" value="month" />
          </Tabs>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CalendarToday sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4">{events?.length || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                总事件数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Today sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">{getTodayEvents().length}</Typography>
              <Typography variant="body2" color="text.secondary">
                今日事件
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <VideoCall sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4">
                {(events || []).filter(e => e.type === 'meeting').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                会议数量
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Sync sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4">
                {(events || []).filter(e => e.source !== 'manual').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                已同步事件
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Today's Events */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                今日日程
              </Typography>
              {getTodayEvents().length > 0 ? (
                <List>
                  {getTodayEvents().map((event, index) => (
                    <React.Fragment key={event._id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${getEventTypeColor(event.type)}.main` }}>
                            {getEventTypeIcon(event.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={event.title}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {new Date(event.startTime).toLocaleTimeString('zh-CN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {new Date(event.endTime).toLocaleTimeString('zh-CN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Typography>
                              {event.location && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 14, mr: 0.5 }} />
                                  <Typography variant="caption">{event.location}</Typography>
                                </Box>
                              )}
                              {event.attendees.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <Person sx={{ fontSize: 14, mr: 0.5 }} />
                                  <Typography variant="caption">
                                    {event.attendees.join(', ')}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                          {getSourceIcon(event.source)}
                          <Chip
                            label={
                              event.type === 'meeting' ? '会议' :
                              event.type === 'appointment' ? '约会' :
                              event.type === 'reminder' ? '提醒' : '任务'
                            }
                            color={getEventTypeColor(event.type)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </ListItem>
                      {index < getTodayEvents().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">今日暂无安排</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                即将到来的事件
              </Typography>
              {getUpcomingEvents().length > 0 ? (
                <List>
                  {getUpcomingEvents().map((event, index) => (
                    <React.Fragment key={event._id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${getEventTypeColor(event.type)}.main` }}>
                            {getEventTypeIcon(event.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={event.title}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {new Date(event.startTime).toLocaleDateString('zh-CN')} {new Date(event.startTime).toLocaleTimeString('zh-CN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Typography>
                              {event.location && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 14, mr: 0.5 }} />
                                  <Typography variant="caption">{event.location}</Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label={
                            event.type === 'meeting' ? '会议' :
                            event.type === 'appointment' ? '约会' :
                            event.type === 'reminder' ? '提醒' : '任务'
                          }
                          color={getEventTypeColor(event.type)}
                          size="small"
                        />
                      </ListItem>
                      {index < getUpcomingEvents().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">暂无即将到来的事件</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* All Events List */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                所有事件 ({viewMode === 'day' ? '今日' : viewMode === 'week' ? '本周' : '本月'})
              </Typography>
              {(events || []).length > 0 ? (
                <List>
                  {(events || [])
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                    .map((event, index) => (
                    <React.Fragment key={event._id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${getEventTypeColor(event.type)}.main` }}>
                            {getEventTypeIcon(event.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={event.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                {event.description}
                              </Typography>
                              <Typography variant="caption" display="block">
                                {new Date(event.startTime).toLocaleDateString('zh-CN')} {new Date(event.startTime).toLocaleTimeString('zh-CN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - {new Date(event.endTime).toLocaleTimeString('zh-CN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </Typography>
                              {event.location && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 14, mr: 0.5 }} />
                                  <Typography variant="caption">{event.location}</Typography>
                                </Box>
                              )}
                              {event.attendees.length > 0 && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <Person sx={{ fontSize: 14, mr: 0.5 }} />
                                  <Typography variant="caption">
                                    参与者: {event.attendees.join(', ')}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                          {getSourceIcon(event.source)}
                          <Chip
                            label={
                              event.type === 'meeting' ? '会议' :
                              event.type === 'appointment' ? '约会' :
                              event.type === 'reminder' ? '提醒' : '任务'
                            }
                            color={getEventTypeColor(event.type)}
                            size="small"
                          />
                          <Chip
                            label={event.status === 'confirmed' ? '已确认' : event.status === 'tentative' ? '待定' : '已取消'}
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      </ListItem>
                      {index < (events || []).length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  {viewMode === 'day' ? '今日' : viewMode === 'week' ? '本周' : '本月'}暂无事件
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Event Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建新事件</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="事件标题"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="事件描述"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="开始时间"
                InputLabelProps={{ shrink: true }}
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="结束时间"
                InputLabelProps={{ shrink: true }}
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="地点"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>事件类型</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as EventFormData['type'] }))}
                  label="事件类型"
                >
                  <MenuItem value="meeting">会议</MenuItem>
                  <MenuItem value="appointment">约会</MenuItem>
                  <MenuItem value="reminder">提醒</MenuItem>
                  <MenuItem value="task">任务</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="参与者（用逗号分隔）"
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                placeholder="张三, 李四, 王五"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleCreateEvent} variant="contained">创建</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add event"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Calendar;