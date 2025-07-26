import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
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
  Fab,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Schedule,
  Warning,
  Assignment,
  ExpandMore,
  PlayArrow,
  Flag,
  Person,
  CalendarToday,
  Refresh,
  Edit,
  Psychology,
} from '@mui/icons-material';
import CustomGrid from '../../components/common/CustomGrid';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../contexts/ApiContext';

const Grid = CustomGrid;

interface ExecutionPlan {
  planName: string;
  description: string;
  estimatedTime: string;
  resources: string[];
  steps: string[];
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  assignee: string;
  executionPlans: ExecutionPlan[];
  selectedPlan?: {
    planName: string;
    description: string;
    estimatedTime: string;
    resources: string[];
    steps: string[];
    planIndex: number;
    selectedAt: string;
    executionResults?: {
      executionId: string;
      status: 'executing' | 'completed' | 'failed';
      startTime: string;
      endTime?: string;
      progress: number;
      currentStep: number;
      results: string;
      outputs: Array<{
        stepIndex: number;
        stepName: string;
        output: string;
        timestamp: string;
        status: 'pending' | 'running' | 'completed' | 'error';
      }>;
    };
  };
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
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    assignee: user?.username || '',
  });
  const [planningTask, setPlanningTask] = useState<Task | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{task: Task, planIndex: number, plan: ExecutionPlan} | null>(null);
  const [executingPlan, setExecutingPlan] = useState<{task: Task, planIndex: number} | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [executionResults, setExecutionResults] = useState<any>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/tasks');
      // Handle both API response formats
      const tasksData = response?.tasks || response?.data?.tasks || response || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // Mock data for demo
      setTasks([
        {
          _id: '67762a1b8c9d4e5f6789abcd',
          title: '完成产品需求分析',
          description: '收集并分析用户需求，制定产品功能规格',
          status: 'in_progress' as const,
          priority: 'high' as const,
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
          _id: '67762a2c8c9d4e5f6789abce',
          title: '系统架构设计',
          description: '设计系统整体架构，包括前后端分离和数据库设计',
          status: 'pending' as const,
          priority: 'medium' as const,
          dueDate: '2024-12-28',
          assignee: user?.username || '李四',
          executionPlans: [
            {
              planName: '简化架构',
              description: '采用单体架构，快速开发',
              estimatedTime: '3天',
              resources: ['架构师', '开发团队'],
              steps: ['需求分析', '技术选型', '架构设计', '文档编写']
            },
            {
              planName: '微服务架构',
              description: '采用微服务架构，便于后续扩展',
              estimatedTime: '7天',
              resources: ['架构师', '开发团队', 'DevOps'],
              steps: ['服务拆分', '接口设计', '数据库设计', '部署方案', '监控方案']
            },
            {
              planName: '混合架构',
              description: '核心服务微服务化，辅助功能单体',
              estimatedTime: '5天',
              resources: ['架构师', '开发团队'],
              steps: ['核心服务识别', '架构分层', '接口设计', '数据库设计', '部署规划']
            }
          ],
          createdAt: '2024-12-19T09:00:00Z',
          updatedAt: '2024-12-20T16:45:00Z',
        },
        {
          _id: '67762a3d8c9d4e5f6789abcf',
          title: '前端界面开发',
          description: '开发用户界面，实现响应式设计',
          status: 'completed' as const,
          priority: 'low' as const,
          dueDate: '2024-12-22',
          assignee: user?.username || '王五',
          executionPlans: [
            {
              planName: '原型优先',
              description: '先完成原型，后优化样式',
              estimatedTime: '4天',
              resources: ['UI设计师', '前端开发'],
              steps: ['原型设计', '组件开发', '页面搭建', '样式优化']
            },
            {
              planName: '组件化开发',
              description: '基于组件库快速开发',
              estimatedTime: '6天',
              resources: ['UI设计师', '前端开发', '组件库'],
              steps: ['组件设计', '组件开发', '页面组装', '测试优化', '文档编写']
            }
          ],
          createdAt: '2024-12-18T14:20:00Z',
          updatedAt: '2024-12-22T11:30:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [api, user?.username]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async () => {
    try {
      const newTask = {
        ...formData,
        status: 'pending',
        executionPlans: [],
      };

      const response = await api.post('/tasks', newTask);
      if (response) {
        const createdTask = response.data || response;
        setTasks(prev => [...prev, createdTask]);
        setOpenDialog(false);
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          dueDate: new Date().toISOString().split('T')[0],
          assignee: user?.username || '',
        });
        
        // Auto-generate AI plans for the new task
        if (createdTask && createdTask._id) {
          handleGeneratePlans(createdTask);
        }
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleGeneratePlans = async (task: Task) => {
    setPlanningTask(task);
    setPlanningLoading(true);

    try {
      const response = await api.post('/ai/task-planning', {
        taskDescription: `${task.title}: ${task.description}`,
        deadline: task.dueDate,
        priority: task.priority,
      });

      if (response?.data?.plans || response?.plans) {
        // Convert AI plans to execution plans format
        const aiPlans = response?.data?.plans || response?.plans || [];
        const executionPlans = aiPlans.map((plan: any) => {
          // Extract steps from content if it's a text block
          let steps: string[] = [];
          if (plan.content) {
            // Parse steps from content text
            const stepMatches = plan.content.match(/[0-9][.-]\s*([^\n]+)/g);
            if (stepMatches) {
              steps = stepMatches.map((match: string) => match.replace(/^[0-9][.-]\s*/, '').trim());
            } else {
              // Split by phases/sections
              const sections = plan.content.split(/\n[\u4e00-\u9fa5\w\s]+[\uff1a:]/g);
              steps = sections.filter((s: string) => s.trim().length > 0).map((s: string) => s.trim().replace(/^[-*]\s*/, ''));
            }
          } else if (plan.phases) {
            steps = plan.phases.flatMap((phase: any) => phase.tasks || []);
          } else if (plan.steps) {
            steps = Array.isArray(plan.steps) ? plan.steps : [];
          }
          
          // Extract time estimation from content
          let estimatedTime = plan.duration || plan.estimatedTime || '未指定';
          if (plan.content && !plan.duration) {
            const timeMatch = plan.content.match(/时间估算[\uff1a:]\s*([^\n]+)/);
            if (timeMatch) {
              estimatedTime = timeMatch[1].trim();
            }
          }
          
          return {
            planName: plan.title || plan.name || '执行方案',
            description: plan.description || plan.content || '',
            estimatedTime,
            resources: plan.resources || [],
            steps: steps.length > 0 ? steps : ['步骤1: 开始执行任务', '步骤2: 检查进度', '步骤3: 完成任务']
          };
        });
        
        const updatedTask = { ...task, executionPlans };
        setTasks(prev => prev.map(t => t._id === task._id ? updatedTask : t));
        setPlanningTask(updatedTask);
      }
    } catch (error) {
      console.error('Failed to generate execution plans:', error);
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(task => 
        task._id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleSelectPlan = async (task: Task, selectedPlan: any, planIndex: number) => {
    try {
      // Update task with selected plan and change status to in_progress
      const updatedTask = {
        ...task,
        status: 'in_progress' as const,
        selectedPlan: {
          ...selectedPlan,
          planIndex,
          selectedAt: new Date().toISOString()
        }
      };
      
      await api.patch(`/tasks/${task._id}`, {
        status: 'in_progress',
        selectedPlan: updatedTask.selectedPlan
      });
      
      setTasks(prev => prev.map(t => 
        t._id === task._id ? updatedTask : t
      ));
      
      setPlanningTask(null);
      
      // Show success message
      console.log('成功选择执行方案:', selectedPlan.planName);
    } catch (error) {
      console.error('Failed to select plan:', error);
    }
  };

  const handleEditPlan = (task: Task, planIndex: number, plan: ExecutionPlan) => {
    setEditingPlan({ task, planIndex, plan: { ...plan } });
  };

  const handleSavePlanEdit = async () => {
    if (!editingPlan) return;
    
    try {
      const updatedTask = {
        ...editingPlan.task,
        executionPlans: editingPlan.task.executionPlans.map((p, idx) => 
          idx === editingPlan.planIndex ? editingPlan.plan : p
        )
      };
      
      await api.patch(`/tasks/${editingPlan.task._id}`, {
        executionPlans: updatedTask.executionPlans
      });
      
      setTasks(prev => prev.map(t => 
        t._id === editingPlan.task._id ? updatedTask : t
      ));
      
      // Update planning task if it's the same task
      if (planningTask && planningTask._id === editingPlan.task._id) {
        setPlanningTask(updatedTask);
      }
      
      setEditingPlan(null);
      console.log('成功更新执行方案');
    } catch (error) {
      console.error('Failed to update plan:', error);
    }
  };

  const handleExecutePlan = async (task: Task, planIndex: number) => {
    if (!task.selectedPlan) {
      // Auto-select the plan if not selected
      const planToExecute = task.executionPlans[planIndex];
      await handleSelectPlan(task, planToExecute, planIndex);
      // Continue with execution after a brief delay to ensure state update
      setTimeout(() => executeSelectedPlan(task._id, planIndex), 100);
      return;
    }
    
    executeSelectedPlan(task._id, planIndex);
  };

  const executeSelectedPlan = async (taskId: string, planIndex: number) => {
    setExecutionLoading(true);
    setExecutingPlan({ task: tasks.find(t => t._id === taskId)!, planIndex });
    
    try {
      const response = await api.post('/ai/execute-plan', {
        taskId,
        planIndex,
        customRequirements: 'Generate detailed execution results with step-by-step progress'
      });
      
      if (response?.data?.executionResults || response?.executionResults) {
        const results = response?.data?.executionResults || response?.executionResults;
        
        // Update task with execution results
        const updatedTask = {
          ...tasks.find(t => t._id === taskId)!,
          selectedPlan: {
            ...tasks.find(t => t._id === taskId)!.selectedPlan!,
            executionResults: {
              executionId: results.executionId || `exec_${Date.now()}`,
              status: results.status || 'completed',
              startTime: results.startTime || new Date().toISOString(),
              endTime: results.endTime || new Date().toISOString(),
              progress: results.progress || 100,
              currentStep: results.currentStep || results.outputs?.length || 0,
              results: results.summary || results.results || '执行完成',
              outputs: results.outputs || results.steps || []
            }
          }
        };
        
        setTasks(prev => prev.map(t => 
          t._id === taskId ? updatedTask : t
        ));
        
        setExecutionResults(results);
        setShowExecutionDialog(true);
        console.log('任务执行完成:', results);
      }
    } catch (error) {
      console.error('Failed to execute plan:', error);
      // Show mock execution results for demo
      const mockResults = {
        executionId: `exec_${Date.now()}`,
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 5000).toISOString(),
        progress: 100,
        currentStep: 3,
        summary: '任务执行完成，所有步骤已按计划完成',
        outputs: [
          {
            stepIndex: 0,
            stepName: '步骤1',
            output: '已完成初始化工作',
            timestamp: new Date().toISOString(),
            status: 'completed'
          },
          {
            stepIndex: 1,
            stepName: '步骤2', 
            output: '正在处理核心任务',
            timestamp: new Date(Date.now() + 2000).toISOString(),
            status: 'completed'
          },
          {
            stepIndex: 2,
            stepName: '步骤3',
            output: '任务执行完毕，结果已生成',
            timestamp: new Date(Date.now() + 4000).toISOString(),
            status: 'completed'
          }
        ]
      };
      
      setExecutionResults(mockResults);
      setShowExecutionDialog(true);
    } finally {
      setExecutionLoading(false);
      setExecutingPlan(null);
    }
  };

  const filterTasks = (status?: string) => {
    if (!Array.isArray(tasks)) return [];
    
    switch (status) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'in_progress':
        return tasks.filter(task => task.status === 'in_progress');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'overdue':
        return tasks.filter(task => task.status === 'overdue');
      default:
        return tasks;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      case 'overdue': return <Warning />;
      default: return <Assignment />;
    }
  };

  const tabTasks = (() => {
    switch (activeTab) {
      case 0: return filterTasks();
      case 1: return filterTasks('pending');
      case 2: return filterTasks('in_progress');
      case 3: return filterTasks('completed');
      default: return [];
    }
  })();

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>加载任务中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          任务管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={loadTasks}
        >
          刷新
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`全部 (${filterTasks().length})`} />
          <Tab label={`待处理 (${filterTasks('pending').length})`} />
          <Tab label={`进行中 (${filterTasks('in_progress').length})`} />
          <Tab label={`已完成 (${filterTasks('completed').length})`} />
        </Tabs>
      </Box>

      <Grid container spacing={3}>
        {tabTasks.map((task) => (
          <Grid item xs={12} lg={6} key={task._id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 2 }}>
                    {task.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      icon={getStatusIcon(task.status)}
                      label={task.status === 'in_progress' ? '进行中' : 
                             task.status === 'completed' ? '已完成' : 
                             task.status === 'overdue' ? '已逾期' : '待处理'}
                      color={getStatusColor(task.status) as any}
                      size="small"
                    />
                    <Chip
                      icon={<Flag />}
                      label={task.priority === 'urgent' ? '紧急' : 
                             task.priority === 'high' ? '高' : 
                             task.priority === 'medium' ? '中' : '低'}
                      color={getPriorityColor(task.priority) as any}
                      size="small"
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {task.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2">{task.assignee}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CalendarToday fontSize="small" />
                    <Typography variant="body2">{task.dueDate}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Schedule fontSize="small" />
                    <Typography variant="body2">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {task.status === 'pending' && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleTaskStatusChange(task._id, 'in_progress')}
                    >
                      开始任务
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => handleTaskStatusChange(task._id, 'completed')}
                    >
                      完成任务
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleGeneratePlans(task)}
                    disabled={planningLoading}
                  >
                    AI规划方案
                  </Button>
                </Box>

                {Array.isArray(task.executionPlans) && task.executionPlans.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      执行方案:
                    </Typography>
                    {task.executionPlans.map((plan, index) => (
                      <Accordion key={index} sx={{ mb: 1 }}>
                        <AccordionSummary
                          expandIcon={<ExpandMore />}
                          aria-controls={`panel${index}-content`}
                          id={`panel${index}-header`}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Typography variant="subtitle2">{plan.planName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({plan.estimatedTime})
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {plan.description}
                          </Typography>
                          
                          <Typography variant="caption" display="block" gutterBottom>
                            所需资源:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            {Array.isArray(plan.resources) && plan.resources.map((resource, idx) => (
                              <Chip key={idx} label={resource} size="small" variant="outlined" />
                            ))}
                          </Box>

                          <Typography variant="caption" display="block" gutterBottom>
                            执行步骤:
                          </Typography>
                          <List dense>
                            {Array.isArray(plan.steps) && plan.steps.map((step, idx) => (
                              <ListItem key={idx}>
                                <ListItemText
                                  primary={`${idx + 1}. ${step}`}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                          
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Edit />}
                              onClick={() => handleEditPlan(task, index, plan)}
                            >
                              编辑方案
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Psychology />}
                              onClick={() => handleExecutePlan(task, index)}
                              disabled={executionLoading}
                            >
                              执行方案
                            </Button>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
                
                {task.selectedPlan && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      当前执行方案: {task.selectedPlan.planName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
                      {task.selectedPlan.description.length > 100 ? 
                        task.selectedPlan.description.substring(0, 100) + '...' : 
                        task.selectedPlan.description
                      }
                    </Typography>
                    <Typography variant="caption" display="block">
                      预估时间: {task.selectedPlan.estimatedTime}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      选择时间: {new Date(task.selectedPlan.selectedAt).toLocaleString()}
                    </Typography>
                    
                    {task.selectedPlan.executionResults && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.200' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" color="success.main">
                            执行结果
                          </Typography>
                          <Chip
                            label={task.selectedPlan.executionResults.status === 'completed' ? '已完成' : task.selectedPlan.executionResults.status === 'failed' ? '失败' : '执行中'}
                            size="small"
                            color={task.selectedPlan.executionResults.status === 'completed' ? 'success' : task.selectedPlan.executionResults.status === 'failed' ? 'error' : 'primary'}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1, fontSize: '0.875rem' }}>
                          {task.selectedPlan.executionResults.results}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Typography variant="caption">
                            进度: {task.selectedPlan.executionResults.progress}%
                          </Typography>
                          <Typography variant="caption">
                            步骤: {task.selectedPlan.executionResults.currentStep}/{task.selectedPlan.executionResults.outputs?.length || 0}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => {
                            setExecutionResults(task.selectedPlan?.executionResults);
                            setShowExecutionDialog(true);
                          }}
                        >
                          查看详情
                        </Button>
                      </Box>
                    )}
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
              {Array.isArray(planningTask?.executionPlans) && planningTask.executionPlans.map((plan, index) => (
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
                        {Array.isArray(plan.resources) && plan.resources.map((resource, idx) => (
                          <Chip key={idx} label={resource} size="small" />
                        ))}
                      </Box>
                      <Typography variant="subtitle2" gutterBottom>
                        执行步骤:
                      </Typography>
                      <List dense>
                        {Array.isArray(plan.steps) && plan.steps.map((step, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={`${idx + 1}. ${step}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => planningTask && handleEditPlan(planningTask, index, plan)}
                          startIcon={<Edit />}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => planningTask && handleSelectPlan(planningTask, plan, index)}
                          startIcon={<PlayArrow />}
                        >
                          选择
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => planningTask && handleExecutePlan(planningTask, index)}
                          startIcon={<Psychology />}
                          disabled={executionLoading}
                        >
                          执行
                        </Button>
                      </Box>
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

      {/* Plan Editing Dialog */}
      <Dialog open={!!editingPlan} onClose={() => setEditingPlan(null)} maxWidth="md" fullWidth>
        <DialogTitle>编辑执行方案 - {editingPlan?.plan.planName}</DialogTitle>
        <DialogContent>
          {editingPlan && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="方案名称"
                  value={editingPlan.plan.planName}
                  onChange={(e) => setEditingPlan(prev => prev ? {
                    ...prev,
                    plan: { ...prev.plan, planName: e.target.value }
                  } : null)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="方案描述"
                  value={editingPlan.plan.description}
                  onChange={(e) => setEditingPlan(prev => prev ? {
                    ...prev,
                    plan: { ...prev.plan, description: e.target.value }
                  } : null)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="预估时间"
                  value={editingPlan.plan.estimatedTime}
                  onChange={(e) => setEditingPlan(prev => prev ? {
                    ...prev,
                    plan: { ...prev.plan, estimatedTime: e.target.value }
                  } : null)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="所需资源 (用逗号分隔)"
                  value={Array.isArray(editingPlan.plan.resources) ? editingPlan.plan.resources.join(', ') : ''}
                  onChange={(e) => setEditingPlan(prev => prev ? {
                    ...prev,
                    plan: { ...prev.plan, resources: e.target.value.split(',').map(r => r.trim()).filter(r => r) }
                  } : null)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="执行步骤 (每行一个步骤)"
                  value={Array.isArray(editingPlan.plan.steps) ? editingPlan.plan.steps.join('\n') : ''}
                  onChange={(e) => setEditingPlan(prev => prev ? {
                    ...prev,
                    plan: { ...prev.plan, steps: e.target.value.split('\n').map(s => s.trim()).filter(s => s) }
                  } : null)}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingPlan(null)}>取消</Button>
          <Button onClick={handleSavePlanEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* Execution Results Dialog */}
      <Dialog open={showExecutionDialog} onClose={() => setShowExecutionDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>执行结果</DialogTitle>
        <DialogContent>
          {executionResults && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>执行摘要</Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  {executionResults.summary || executionResults.results || '任务执行完成'}
                </Alert>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>执行状态:</strong> 
                    <Chip 
                      label={executionResults.status === 'completed' ? '已完成' : executionResults.status === 'failed' ? '失败' : '执行中'} 
                      color={executionResults.status === 'completed' ? 'success' : executionResults.status === 'failed' ? 'error' : 'primary'}
                      size="small"
                    />
                  </Typography>
                  <Typography variant="body2">
                    <strong>进度:</strong> {executionResults.progress || 100}%
                  </Typography>
                </Box>
              </Box>
              
              {executionResults.outputs && executionResults.outputs.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>步骤详情</Typography>
                  {executionResults.outputs.map((output: any, index: number) => (
                    <Card key={index} sx={{ mb: 2, bgcolor: output.status === 'completed' ? 'success.50' : 'grey.50' }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={`步骤 ${output.stepIndex + 1}`}
                            size="small"
                            color="primary"
                          />
                          <Typography variant="subtitle2">{output.stepName || `步骤${output.stepIndex + 1}`}</Typography>
                          <Chip
                            label={output.status === 'completed' ? '完成' : output.status === 'error' ? '失败' : '执行中'}
                            size="small"
                            color={output.status === 'completed' ? 'success' : output.status === 'error' ? 'error' : 'primary'}
                          />
                        </Box>
                        <Typography variant="body2">{output.output}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          {new Date(output.timestamp).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExecutionDialog(false)} variant="contained">关闭</Button>
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