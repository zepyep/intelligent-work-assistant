import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  Typography,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Search,
  LocationOn,
  Work,
  Person,
  Message,
  Visibility,
  Star,
  FilterList,
  Clear,
  Business,
  School,
  Language,
} from '@mui/icons-material';

interface User {
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
}

const skillOptions = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript', 'Vue.js', 'Angular',
  'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'C++', 'C#', 'SQL', 'MongoDB',
  'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'Machine Learning', 'Data Science', 'AI', 'DevOps', 'CI/CD', 'Git', 'Linux',
  'UI/UX Design', 'Product Management', 'Project Management', 'Agile', 'Scrum',
];

const industryOptions = [
  '互联网/软件', '金融/银行', '制造业', '医疗健康', '教育/培训', '咨询/服务',
  '媒体/广告', '零售/电商', '房地产', '政府/非营利', '能源/环境', '交通/物流'
];

const UserSearch: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  
  // Search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [experienceRange, setExperienceRange] = useState<[number, number]>([0, 20]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Collaboration request
  const [collaborationData, setCollaborationData] = useState({
    projectDescription: '',
    skills: [] as string[],
    timeline: '',
    message: '',
  });

  const searchUsers = async (resetPage = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = resetPage ? 1 : page;
      if (resetPage) {
        setPage(1);
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSkills.length > 0) params.append('skills', selectedSkills.join(','));
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (selectedLocation) params.append('location', selectedLocation);
      
      const response = await fetch(`/api/social/users?${params}`, {
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
        setUsers(data.data);
        setTotalPages(data.pagination?.pages || 1);
        setTotalUsers(data.pagination?.total || 0);
      } else {
        setError('Failed to search users');
      }
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    searchUsers();
  }, [page]);

  const handleSearch = () => {
    searchUsers(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSkills([]);
    setSelectedIndustry('');
    setSelectedLocation('');
    setExperienceRange([0, 20]);
    // Auto-search after clearing
    setTimeout(() => searchUsers(true), 100);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

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
          recipientId: selectedUser?._id,
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

  const UserCard: React.FC<{ user: User }> = ({ user }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
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
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {user.profile.bio?.length > 100 
            ? `${user.profile.bio.substring(0, 100)}...` 
            : user.profile.bio}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          {user.profile.skills?.slice(0, 3).map((skill, index) => (
            <Chip
              key={index}
              label={skill}
              size="small"
              variant="outlined"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {user.profile.skills?.length > 3 && (
            <Chip
              label={`+${user.profile.skills.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          )}
        </Box>
      </CardContent>
      
      <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Visibility />}
          onClick={() => handleViewUser(user)}
          size="small"
          fullWidth
        >
          查看
        </Button>
        {user.socialSettings.acceptCollaborations && (
          <Button
            variant="contained"
            startIcon={<Message />}
            onClick={() => {
              setSelectedUser(user);
              setShowCollaborationDialog(true);
            }}
            size="small"
            fullWidth
          >
            合作
          </Button>
        )}
      </Box>
    </Card>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          搜索用户
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="搜索关键词"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              placeholder="姓名、职位、公司..."
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              multiple
              options={skillOptions}
              value={selectedSkills}
              onChange={(e, value) => setSelectedSkills(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="技能"
                  placeholder="选择技能..."
                />
              )}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>行业</InputLabel>
              <Select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                label="行业"
              >
                <MenuItem value="">全部</MenuItem>
                {industryOptions.map((industry) => (
                  <MenuItem key={industry} value={industry}>
                    {industry}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="工作地点"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              size="small"
              placeholder="城市或地区"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<Search />}
                disabled={loading}
              >
                搜索
              </Button>
              <IconButton onClick={handleClearFilters} title="清除筛选">
                <Clear />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Search Results */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? '搜索中...' : `找到 ${totalUsers} 个用户`}
        </Typography>
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {users.map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user._id}>
              <UserCard user={user} />
            </Grid>
          ))}
          
          {users.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  没有找到匹配的用户
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  尝试调整搜索条件或清除筛选器
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* User Detail Dialog */}
      <Dialog
        open={showUserDetail}
        onClose={() => setShowUserDetail(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2 }}>
              {selectedUser?.profile.fullName?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedUser?.profile.fullName}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {selectedUser?.profile.position}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedUser.profile.bio}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  专业技能
                </Typography>
                <Box>
                  {selectedUser.profile.skills?.map((skill, index) => (
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
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  基本信息
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Business />
                    </ListItemIcon>
                    <ListItemText 
                      primary="公司" 
                      secondary={selectedUser.profile.company} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LocationOn />
                    </ListItemIcon>
                    <ListItemText 
                      primary="地点" 
                      secondary={selectedUser.profile.location} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Work />
                    </ListItemIcon>
                    <ListItemText 
                      primary="工作经验" 
                      secondary={`${selectedUser.profile.experience}年`} 
                    />
                  </ListItem>
                </List>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUserDetail(false)}>
            关闭
          </Button>
          {selectedUser?.socialSettings.acceptCollaborations && (
            <Button
              variant="contained"
              onClick={() => {
                setShowUserDetail(false);
                setShowCollaborationDialog(true);
              }}
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
        onClose={() => setShowCollaborationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          向 {selectedUser?.profile.fullName} 发起合作请求
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
            
            <Autocomplete
              multiple
              options={skillOptions}
              value={collaborationData.skills}
              onChange={(e, value) => setCollaborationData(prev => ({
                ...prev,
                skills: value
              }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="所需技能"
                  placeholder="选择项目所需的技能..."
                />
              )}
              sx={{ mb: 2 }}
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
          <Button onClick={() => setShowCollaborationDialog(false)}>
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

export default UserSearch;