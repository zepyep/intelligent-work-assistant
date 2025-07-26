import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Badge,
  Divider,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Message,
  Send,
  Inbox,
  Check,
  Close,
  MoreVert,
  Person,
  Schedule,
  Business,
  Work,
} from '@mui/icons-material';

interface CollaborationRequest {
  _id: string;
  sender: {
    _id: string;
    profile: {
      fullName: string;
      position?: string;
      company?: string;
      avatar?: string;
    };
  };
  recipient: {
    _id: string;
    profile: {
      fullName: string;
      position?: string;
      company?: string;
      avatar?: string;
    };
  };
  projectDescription: string;
  skills: string[];
  timeline: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  updatedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`requests-tabpanel-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const CollaborationRequests: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [receivedRequests, setReceivedRequests] = useState<CollaborationRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CollaborationRequest | null>(null);
  const [showRequestDetail, setShowRequestDetail] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchCollaborationRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Note: These endpoints would need to be implemented in the backend
      const [receivedResponse, sentResponse] = await Promise.all([
        fetch('/api/social/collaboration-requests/received', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/social/collaboration-requests/sent', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (receivedResponse.ok) {
        const receivedData = await receivedResponse.json();
        if (receivedData.success) {
          setReceivedRequests(receivedData.data);
        }
      }

      if (sentResponse.ok) {
        const sentData = await sentResponse.json();
        if (sentData.success) {
          setSentRequests(sentData.data);
        }
      }
    } catch (err) {
      console.error('Error fetching collaboration requests:', err);
      setError('Failed to fetch collaboration requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborationRequests();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRequestAction = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/social/collaboration-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Refresh the requests
        await fetchCollaborationRequests();
        setActionMenuAnchor(null);
        setShowRequestDetail(false);
      } else {
        setError(`Failed to ${action} request`);
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      setError(`Failed to ${action} request`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'accepted': return '已接受';
      case 'declined': return '已拒绝';
      case 'expired': return '已过期';
      default: return status;
    }
  };

  const RequestCard: React.FC<{ 
    request: CollaborationRequest; 
    type: 'received' | 'sent' 
  }> = ({ request, type }) => {
    const otherUser = type === 'received' ? request.sender : request.recipient;
    
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Avatar
                sx={{ width: 50, height: 50, mr: 2 }}
                src={otherUser.profile?.avatar || ''}
              >
                {otherUser.profile.fullName?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div">
                  {otherUser.profile.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {otherUser.profile?.position || 'Unknown Position'} @ {otherUser.profile?.company || 'Unknown Company'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(request.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={getStatusLabel(request.status)}
                color={getStatusColor(request.status) as any}
                size="small"
              />
              <IconButton
                size="small"
                onClick={(e) => {
                  setSelectedRequest(request);
                  setActionMenuAnchor(e.currentTarget);
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              项目描述
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {request.projectDescription.length > 100 
                ? `${request.projectDescription.substring(0, 100)}...` 
                : request.projectDescription}
            </Typography>
          </Box>
          
          {request.skills.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                所需技能
              </Typography>
              <Box>
                {request.skills.slice(0, 5).map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
                {request.skills.length > 5 && (
                  <Chip
                    label={`+${request.skills.length - 5}`}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                )}
              </Box>
            </Box>
          )}
          
          {request.timeline && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                时间安排: {request.timeline}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setSelectedRequest(request);
                setShowRequestDetail(true);
              }}
              size="small"
            >
              查看详情
            </Button>
            
            {type === 'received' && request.status === 'pending' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Check />}
                  onClick={() => handleRequestAction(request._id, 'accept')}
                  size="small"
                  disabled={loading}
                >
                  接受
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Close />}
                  onClick={() => handleRequestAction(request._id, 'decline')}
                  size="small"
                  disabled={loading}
                >
                  拒绝
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Mock data for demonstration
  const mockReceivedRequests: CollaborationRequest[] = [
    {
      _id: '1',
      sender: {
        _id: 'user1',
        profile: {
          fullName: '张三',
          position: '前端开发工程师',
          company: '科技公司A',
        }
      },
      recipient: {
        _id: 'currentUser',
        profile: { fullName: '当前用户' }
      },
      projectDescription: '需要开发一个React Web应用，包含用户管理和数据可视化功能。',
      skills: ['React', 'JavaScript', 'Node.js', 'MongoDB'],
      timeline: '3个月兼职项目',
      message: '您好，我看到您在React和数据可视化方面有丰富经验，希望能够合作开发这个项目。',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const mockSentRequests: CollaborationRequest[] = [
    {
      _id: '2',
      sender: {
        _id: 'currentUser',
        profile: { fullName: '当前用户', position: '', company: '' }
      },
      recipient: {
        _id: 'user2',
        profile: { fullName: '李四' }
      },
      projectDescription: '移动App后端API开发项目',
      skills: ['Node.js', 'Express', 'MongoDB'],
      timeline: '2个月',
      message: '希望能够合作开发这个移动应用的后端服务。',
      status: 'accepted',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          合作请求
        </Typography>
        <Typography variant="body2" color="text.secondary">
          管理您收到和发送的合作请求
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            icon={
              <Badge badgeContent={mockReceivedRequests.filter(r => r.status === 'pending').length} color="error">
                <Inbox />
              </Badge>
            }
            label="收到的请求"
            iconPosition="start"
          />
          <Tab 
            icon={<Send />}
            label="发送的请求"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : mockReceivedRequests.length > 0 ? (
          <Box>
            {mockReceivedRequests.map((request) => (
              <RequestCard 
                key={request._id} 
                request={request} 
                type="received"
              />
            ))}
          </Box>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Inbox sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无收到的合作请求
            </Typography>
            <Typography variant="body2" color="text.secondary">
              当其他用户向您发送合作请求时，会在这里显示
            </Typography>
          </Paper>
        )}
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : mockSentRequests.length > 0 ? (
          <Box>
            {mockSentRequests.map((request) => (
              <RequestCard 
                key={request._id} 
                request={request} 
                type="sent"
              />
            ))}
          </Box>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Send sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无发送的合作请求
            </Typography>
            <Typography variant="body2" color="text.secondary">
              您发送的合作请求会在这里显示
            </Typography>
          </Paper>
        )}
      </TabPanel>

      {/* Request Detail Dialog */}
      <Dialog
        open={showRequestDetail}
        onClose={() => setShowRequestDetail(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRequest && (
          <>
            <DialogTitle>
              合作请求详情
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  项目描述
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedRequest.projectDescription}
                </Typography>
              </Box>

              {selectedRequest.skills.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    所需技能
                  </Typography>
                  <Box>
                    {selectedRequest.skills.map((skill, index) => (
                      <Chip
                        key={index}
                        label={skill}
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {selectedRequest.timeline && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    时间安排
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.timeline}
                  </Typography>
                </Box>
              )}

              {selectedRequest.message && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    附加消息
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.message}
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowRequestDetail(false)}>
                关闭
              </Button>
              {selectedRequest.status === 'pending' && currentTab === 0 && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Check />}
                    onClick={() => handleRequestAction(selectedRequest._id, 'accept')}
                    disabled={loading}
                  >
                    接受
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Close />}
                    onClick={() => handleRequestAction(selectedRequest._id, 'decline')}
                    disabled={loading}
                  >
                    拒绝
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setShowRequestDetail(true);
          setActionMenuAnchor(null);
        }}>
          查看详情
        </MenuItem>
        {selectedRequest?.status === 'pending' && currentTab === 0 && (
          [
            <MenuItem key="accept" onClick={() => handleRequestAction(selectedRequest._id, 'accept')}>
              接受请求
            </MenuItem>,
            <MenuItem key="decline" onClick={() => handleRequestAction(selectedRequest._id, 'decline')}>
              拒绝请求
            </MenuItem>
          ]
        )}
      </Menu>
    </Box>
  );
};

export default CollaborationRequests;