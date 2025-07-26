import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  TrendingUp,
  Person,
  Work,
  LocationOn,
  Business,
  Star,
  Message,
  Refresh,
  FilterList,
  Close,
  Speed,
} from '@mui/icons-material';

interface RecommendedUser {
  user: {
    _id: string;
    profile: {
      fullName: string;
      position: string;
      company: string;
      location: string;
      bio: string;
      skills: string[];
      industry: string;
      experience: number;
      avatar?: string;
    };
    socialSettings: {
      isPublic: boolean;
      acceptCollaborations: boolean;
    };
  };
  matchScore: number;
  matchReasons: string[];
}

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<RecommendedUser | null>(null);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  
  // Recommendation criteria
  const [criteria, setCriteria] = useState({
    skillMatch: true,
    industryMatch: true,
    locationMatch: false,
    experienceRange: [0, 20] as [number, number],
    collaborationHistory: true,
  });
  
  const [limit, setLimit] = useState(10);
  
  // Collaboration request
  const [collaborationData, setCollaborationData] = useState({
    projectDescription: '',
    skills: [] as string[],
    timeline: '',
    message: '',
  });

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/social/recommend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRecommendations(data.data);
      } else {
        setError('Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleSendCollaborationRequest = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/social/collaboration-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: selectedUser?.user._id,
          ...collaborationData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setShowCollaborationDialog(false);
        setCollaborationData({
          projectDescription: '',
          skills: [],
          timeline: '',
          message: '',
        });
        // Show success message or notification
      } else {
        setError('Failed to send collaboration request');
      }
    } catch (err) {
      console.error('Error sending collaboration request:', err);
      setError('Failed to send collaboration request');
    } finally {
      setLoading(false);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'info'; 
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 90) return '极高匹配';
    if (score >= 70) return '高匹配';
    if (score >= 50) return '中等匹配';
    return '基础匹配';
  };

  const RecommendationCard: React.FC<{ recommendation: RecommendedUser }> = ({ recommendation }) => {
    const { user, matchScore, matchReasons } = recommendation;
    
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Match Score Badge */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
          <Chip
            label={`${Math.round(matchScore)}%`}
            color={getMatchScoreColor(matchScore)}
            size="small"
            icon={<Speed />}
          />
        </Box>
        
        <CardContent sx={{ flexGrow: 1, pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{ width: 50, height: 50, mr: 2 }}
              src={user.profile.avatar}
            >
              {user.profile.fullName?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="div" noWrap>
                {user.profile.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.profile.position}
              </Typography>
            </Box>
            {user.socialSettings.acceptCollaborations && (
              <Tooltip title="接受合作">
                <Badge color="success" variant="dot">
                  <Message />
                </Badge>
              </Tooltip>
            )}
          </Box>
          
          {/* Match Score Progress */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                匹配度
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {getMatchScoreLabel(matchScore)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={matchScore}
              color={getMatchScoreColor(matchScore)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          
          {/* Basic Info */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Business sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.profile.company}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.profile.location}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Work sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {user.profile.experience}年经验
              </Typography>
            </Box>
          </Box>
          
          {/* Match Reasons */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              匹配原因
            </Typography>
            <List dense>
              {matchReasons.slice(0, 3).map((reason, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Star sx={{ fontSize: 16, color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={reason} 
                    primaryTypographyProps={{ 
                      variant: 'body2', 
                      color: 'text.secondary' 
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
          
          {/* Skills Preview */}
          <Box sx={{ mb: 2 }}>
            {user.profile.skills?.slice(0, 4).map((skill, index) => (
              <Chip
                key={index}
                label={skill}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
            {user.profile.skills?.length > 4 && (
              <Chip
                label={`+${user.profile.skills.length - 4}`}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            )}
          </Box>
          
          {/* Bio Preview */}
          <Typography variant="body2" color="text.secondary">
            {user.profile.bio?.length > 80 
              ? `${user.profile.bio.substring(0, 80)}...` 
              : user.profile.bio}
          </Typography>
        </CardContent>
        
        <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setSelectedUser(recommendation)}
            size="small"
            fullWidth
          >
            查看详情
          </Button>
          {user.socialSettings.acceptCollaborations && (
            <Button
              variant="contained"
              startIcon={<Message />}
              onClick={() => {
                setSelectedUser(recommendation);
                setShowCollaborationDialog(true);
              }}
              size="small"
              fullWidth
            >
              发起合作
            </Button>
          )}
        </Box>
      </Card>
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            为您推荐
          </Typography>
          <Typography variant="body2" color="text.secondary">
            基于您的技能、经验和偏好为您匹配合适的合作伙伴
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="刷新推荐">
            <IconButton onClick={fetchRecommendations} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Recommendation Criteria */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          推荐设置
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>推荐数量</InputLabel>
              <Select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                label="推荐数量"
              >
                <MenuItem value={5}>5个</MenuItem>
                <MenuItem value={10}>10个</MenuItem>
                <MenuItem value={15}>15个</MenuItem>
                <MenuItem value={20}>20个</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              onClick={fetchRecommendations}
              disabled={loading}
              startIcon={<Refresh />}
            >
              更新推荐
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Recommendations Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {recommendations.map((recommendation, index) => (
            <Grid item xs={12} sm={6} md={4} key={recommendation.user._id}>
              <RecommendationCard recommendation={recommendation} />
            </Grid>
          ))}
          
          {recommendations.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  暂无推荐用户
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  完善您的个人档案以获得更好的推荐匹配
                </Typography>
                <Button
                  variant="outlined"
                  onClick={fetchRecommendations}
                  startIcon={<Refresh />}
                >
                  重新获取推荐
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* User Detail Dialog */}
      <Dialog
        open={!!selectedUser && !showCollaborationDialog}
        onClose={() => setSelectedUser(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 2 }}>
                {selectedUser?.user.profile.fullName?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedUser?.user.profile.fullName}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {selectedUser?.user.profile.position}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`匹配度: ${Math.round(selectedUser?.matchScore || 0)}%`}
              color={getMatchScoreColor(selectedUser?.matchScore || 0)}
              icon={<Speed />}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedUser.user.profile.bio}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  匹配分析
                </Typography>
                <List>
                  {selectedUser.matchReasons.map((reason, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Star color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={reason} />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  专业技能
                </Typography>
                <Box>
                  {selectedUser.user.profile.skills?.map((skill, index) => (
                    <Chip
                      key={index}
                      label={skill}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom>
                  基本信息
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Business />
                    </ListItemIcon>
                    <ListItemText 
                      primary="公司" 
                      secondary={selectedUser.user.profile.company} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LocationOn />
                    </ListItemIcon>
                    <ListItemText 
                      primary="地点" 
                      secondary={selectedUser.user.profile.location} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Work />
                    </ListItemIcon>
                    <ListItemText 
                      primary="工作经验" 
                      secondary={`${selectedUser.user.profile.experience}年`} 
                    />
                  </ListItem>
                </List>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedUser(null)}>
            关闭
          </Button>
          {selectedUser?.user.socialSettings.acceptCollaborations && (
            <Button
              variant="contained"
              onClick={() => setShowCollaborationDialog(true)}
              startIcon={<Message />}
            >
              发起合作
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Collaboration Request Dialog */}
      <Dialog
        open={showCollaborationDialog}
        onClose={() => {
          setShowCollaborationDialog(false);
          setCollaborationData({
            projectDescription: '',
            skills: [],
            timeline: '',
            message: '',
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          向 {selectedUser?.user.profile.fullName} 发起合作请求
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="项目描述"
              multiline
              rows={3}
              value={collaborationData.projectDescription}
              onChange={(e) => setCollaborationData(prev => ({
                ...prev,
                projectDescription: e.target.value
              }))}
              sx={{ mb: 2 }}
              required
            />
            
            <TextField
              fullWidth
              label="项目时间"
              value={collaborationData.timeline}
              onChange={(e) => setCollaborationData(prev => ({
                ...prev,
                timeline: e.target.value
              }))}
              sx={{ mb: 2 }}
              placeholder="例如：3个月、兼职、短期项目等"
            />
            
            <TextField
              fullWidth
              label="个人消息"
              multiline
              rows={3}
              value={collaborationData.message}
              onChange={(e) => setCollaborationData(prev => ({
                ...prev,
                message: e.target.value
              }))}
              placeholder="介绍一下您和这个项目的更多信息..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCollaborationDialog(false);
            setCollaborationData({
              projectDescription: '',
              skills: [],
              timeline: '',
              message: '',
            });
          }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSendCollaborationRequest}
            disabled={loading || !collaborationData.projectDescription}
          >
            发送请求
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Recommendations;