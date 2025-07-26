import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Avatar,
} from '@mui/material';
import CustomGrid from '../../components/common/CustomGrid';
const Grid = CustomGrid;
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  Warning,
  Assignment,
  ExpandMore,
  PlayArrow,
  Pause,
  Flag,
  Person,
  CalendarToday,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  assignee: string;
  executionPlans: Array<{
    planName: string;
    description: string;
    estimatedTime: string;
    resources: string[];
    steps: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  assignee: string;
}

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const api = useApi();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    assignee: user?.username || '',
  });
  const [planningTask, setPlanningTask] = useState<Task | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Mock data for demo
      setTasks([
        {
          _id: '1',
          title: '完成产品需求分析',
          description: '收集并分析用户需求，制定产品功能规格',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2024-12-25',
          assignee: user?.username || '张三',
          executionPlans: [
            {
              planName: '快速方案',
              description: '优先完成核心功能需求分析',
              estimatedTime: '2天',
              resources: ['需求文档', 'BA团队'],
              steps: ['收集用户反馈', '整理功能清单', '优先级排序', '编写需求文档']
            },
            {
              planName: '全面方案',
              description: '深入分析所有需求，包含用户体验研究',
              estimatedTime: '5天',
              resources: ['需求文档', 'BA团队', 'UX团队'],
              steps: ['用户调研', '竞品分析', '需求分析', 'UX设计', '技术评估', '需求文档']
            },
            {
              planName: '渐进方案',
              description: '分阶段完成需求分析，先易后难',
              estimatedTime: '3天',
              resources: ['需求文档', 'BA团队'],
              steps: ['基础需求分析', '核心功能设计', '扩展功能规划', '文档整理']
            }
          ],
          createdAt: '2024-12-20T10:00:00Z',
          updatedAt: '2024-12-21T14:30:00Z',
        },
        {
          _id: '2',
          title: '准备周例会材料',
          description: '整理本周工作进展和下周计划',
          status: 'pending',
          priority: 'medium',
          dueDate: '2024-12-23',
          assignee: user?.username || '李四',
          executionPlans: [],
          createdAt: '2024-12-21T09:00:00Z',
          updatedAt: '2024-12-21T09:00:00Z',
        }
      ]);
    }
    setLoading(false);
  };

  const handleCreateTask = async () => {
    try {
      const response = await api.post('/tasks', formData);
      if (response.data.success) {
        await loadTasks();
        setOpenDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      // For demo, add task locally
      const newTask: Task = {
        _id: Date.now().toString(),
        ...formData,
        status: 'pending',
        executionPlans: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);
      setOpenDialog(false);
      resetForm();
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(task => 
        task._id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task
      ));
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Update locally for demo
      setTasks(prev => prev.map(task => 
        task._id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task
      ));
    }
  };

  const handleGeneratePlans = async (task: Task) => {
    setPlanningTask(task);
    setPlanningLoading(true);
    try {
      const response = await api.post(`/tasks/${task._id}/generate-plans`);
      if (response.data.success) {
        const updatedTask = { ...task, executionPlans: response.data.executionPlans };
        setTasks(prev => prev.map(t => t._id === task._id ? updatedTask : t));
        setPlanningTask(updatedTask);
      }
    } catch (error) {
      console.error('Failed to generate plans:', error);
      // For demo, use mock plans
      const mockPlans = [
        {
          planName: '快速执行方案',
          description: '优先完成最重要的任务内容',
          estimatedTime: '1-2天',
          resources: ['现有团队', '基础工具'],
          steps: ['需求确认', '快速设计', '核心实现', '基本测试']
        },
        {
          planName: '标准执行方案',  
          description: '按照标准流程完整执行任务',
          estimatedTime: '3-4天',
          resources: ['完整团队', '标准工具', '外部协作'],
          steps: ['详细分析', '方案设计', '分步实施', '质量保证', '交付验收']
        },
        {
          planName: '高质量方案',
          description: '追求最佳质量和长期价值的执行方式',
          estimatedTime: '5-7天',  
          resources: ['专业团队', '高级工具', '外部顾问'],
          steps: ['深度调研', '专业设计', '精细实施', '全面测试', '优化改进', '文档完善']
        }
      ];
      const updatedTask = { ...task, executionPlans: mockPlans };
      setTasks(prev => prev.map(t => t._id === task._id ? updatedTask : t));
      setPlanningTask(updatedTask);
    }
    setPlanningLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      assignee: user?.username || '',
    });
    setEditingTask(null);
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      case 'overdue': return <Warning />;
      default: return <Schedule />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const filterTasks = (status?: Task['status']) => {
    if (!status) return tasks;
    return tasks.filter(task => task.status === status);
  };

  const getTabTasks = () => {
    switch (activeTab) {
      case 0: return tasks; // 全部
      case 1: return filterTasks('pending'); // 待处理
      case 2: return filterTasks('in_progress'); // 进行中
      case 3: return filterTasks('completed'); // 已完成
      default: return tasks;
    }
  };

  const tabTasks = getTabTasks();

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>
          加载任务数据...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          任务管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadTasks}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            新建任务
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assignment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4">{tasks.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                总任务数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PlayArrow sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">{filterTasks('in_progress').length}</Typography>
              <Typography variant="body2" color="text.secondary">
                进行中
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4">{filterTasks('completed').length}</Typography>
              <Typography variant="body2" color="text.secondary">
                已完成
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4">{filterTasks('overdue').length}</Typography>
              <Typography variant="body2" color="text.secondary">
                已逾期
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`全部 (${tasks.length})`} />
          <Tab label={`待处理 (${filterTasks('pending').length})`} />
          <Tab label={`进行中 (${filterTasks('in_progress').length})`} />
          <Tab label={`已完成 (${filterTasks('completed').length})`} />
        </Tabs>
      </Card>

      {/* Task List */}
      <Grid container spacing={3}>
        {tabTasks.map((task) => (
          <Grid item xs={12} key={task._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ flex: 1 }}>
                        {task.title}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(task.status)}
                        label={
                          task.status === 'pending' ? '待处理' :
                          task.status === 'in_progress' ? '进行中' :
                          task.status === 'completed' ? '已完成' : '已逾期'
                        }
                        color={getStatusColor(task.status)}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Chip
                        icon={<Flag />}
                        label={
                          task.priority === 'low' ? '低' :
                          task.priority === 'medium' ? '中' :
                          task.priority === 'high' ? '高' : '紧急'
                        }
                        color={getPriorityColor(task.priority)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {task.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Person sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption">{task.assignee}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} />
                        <Typography variant="caption">
                          截止: {new Date(task.dueDate).toLocaleDateString('zh-CN')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ ml: 2 }}>
                    {task.status !== 'completed' && (
                      <>
                        <Button
                          size="small"
                          startIcon={task.status === 'in_progress' ? <Pause /> : <PlayArrow />}
                          onClick={() => handleUpdateTaskStatus(
                            task._id, 
                            task.status === 'in_progress' ? 'pending' : 'in_progress'
                          )}
                          sx={{ mr: 1, mb: 1, display: 'block' }}
                        >
                          {task.status === 'in_progress' ? '暂停' : '开始'}
                        </Button>
                        <Button
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => handleUpdateTaskStatus(task._id, 'completed')}
                          sx={{ mr: 1, mb: 1, display: 'block' }}
                        >
                          完成
                        </Button>
                      </>
                    )}
                    {task.executionPlans.length === 0 && task.status !== 'completed' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Assignment />}
                        onClick={() => handleGeneratePlans(task)}
                        sx={{ display: 'block', mb: 1 }}
                      >
                        生成执行方案
                      </Button>
                    )}
                  </Box>
                </Box>

                {/* Execution Plans */}
                {task.executionPlans.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      执行方案建议:
                    </Typography>
                    {task.executionPlans.map((plan, index) => (
                      <Accordion key={index} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Typography sx={{ flex: 1 }}>{plan.planName}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                              预估: {plan.estimatedTime}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {plan.description}
                          </Typography>
                          <Typography variant="subtitle2" gutterBottom>
                            所需资源:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            {plan.resources.map((resource, idx) => (
                              <Chip key={idx} label={resource} size="small" />
                            ))}
                          </Box>
                          <Typography variant="subtitle2" gutterBottom>
                            执行步骤:
                          </Typography>
                          <List dense>
                            {plan.steps.map((step, idx) => (
                              <ListItem key={idx}>
                                <ListItemText
                                  primary={`${idx + 1}. ${step}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {tabTasks.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info">
              暂无任务数据
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* Create Task Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>创建新任务</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="任务标题"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="任务描述"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskFormData['priority'] }))}
                  label="优先级"
                >
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="medium">中</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="urgent">紧急</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="截止日期"
                InputLabelProps={{ shrink: true }}
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="负责人"
                value={formData.assignee}
                onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button onClick={handleCreateTask} variant="contained">创建</Button>
        </DialogActions>
      </Dialog>

      {/* Planning Dialog */}
      <Dialog open={!!planningTask} onClose={() => setPlanningTask(null)} maxWidth="lg" fullWidth>
        <DialogTitle>
          任务执行方案 - {planningTask?.title}
          {planningLoading && <LinearProgress sx={{ mt: 1 }} />}
        </DialogTitle>
        <DialogContent>
          {planningLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>AI正在生成任务执行方案...</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {planningTask?.executionPlans.map((plan, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {plan.planName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {plan.description}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        预估时间: {plan.estimatedTime}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        所需资源:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {plan.resources.map((resource, idx) => (
                          <Chip key={idx} label={resource} size="small" />
                        ))}
                      </Box>
                      <Typography variant="subtitle2" gutterBottom>
                        执行步骤:
                      </Typography>
                      <List dense>
                        {plan.steps.map((step, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={`${idx + 1}. ${step}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanningTask(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Tasks;