git import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Badge,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Person,
  People,
  PersonAdd,
  Settings,
  Upload,
  Visibility,
  Message,
  Close,
  LocationOn,
  Work,
  School,
  Star,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import SocialProfile from './components/SocialProfile';
import UserSearch from './components/UserSearch';
import Recommendations from './components/Recommendations';
import SimilarUsers from './components/SimilarUsers';
import CollaborationRequests from './components/CollaborationRequests';
import ResumeAnalysis from './components/ResumeAnalysis';

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
      id={`social-tabpanel-${index}`}
      aria-labelledby={`social-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Social: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [socialProfile, setSocialProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's social profile on component mount
  useEffect(() => {
    const fetchSocialProfile = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get('/social/profile');
        setSocialProfile(data);
      } catch (err) {
        console.error('Error fetching social profile:', err);
        setError('Failed to load social profile');
      } finally {
        setLoading(false);
      }
    };

    fetchSocialProfile();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="50vh"
        >
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box mt={4}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          社交网络
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          连接同行，发现合作机会，扩展您的专业网络
        </Typography>
      </Box>

      {/* Profile Overview Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent sx={{ color: 'white' }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{ 
                  width: 80, 
                  height: 80,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  fontSize: '2rem'
                }}
              >
                {user?.profile?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h5" gutterBottom>
                {user?.profile?.fullName || user?.username}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                {socialProfile?.profile?.position || user?.profile?.position}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {socialProfile?.profile?.skills?.slice(0, 3).map((skill: string, index: number) => (
                  <Chip
                    key={index}
                    label={skill}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  />
                ))}
                {socialProfile?.profile?.skills?.length > 3 && (
                  <Chip
                    label={`+${socialProfile.profile.skills.length - 3} more`}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                    }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography variant="h3" component="div">
                  {socialProfile?.stats?.connectionCount || 0}
                </Typography>
                <Typography variant="caption">连接数</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography variant="h3" component="div">
                  {socialProfile?.stats?.collaborationCount || 0}
                </Typography>
                <Typography variant="caption">合作项目</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<Person />}
            label="个人档案"
            iconPosition="start"
          />
          <Tab
            icon={<Search />}
            label="用户搜索"
            iconPosition="start"
          />
          <Tab
            icon={<TrendingUp />}
            label="推荐用户"
            iconPosition="start"
          />
          <Tab
            icon={<People />}
            label="相似用户"
            iconPosition="start"
          />
          <Tab
            icon={<Upload />}
            label="简历分析"
            iconPosition="start"
          />
          <Tab
            icon={<Message />}
            label="合作请求"
            iconPosition="start"
            sx={{
              '& .MuiTab-wrapper': {
                position: 'relative'
              }
            }}
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <SocialProfile 
          profile={socialProfile} 
          onProfileUpdate={setSocialProfile}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <UserSearch />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Recommendations />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <SimilarUsers />
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <ResumeAnalysis />
      </TabPanel>

      <TabPanel value={currentTab} index={5}>
        <CollaborationRequests />
      </TabPanel>

      {/* Floating Action Button for Quick Actions */}
      <Fab
        color="primary"
        aria-label="quick-actions"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
        onClick={() => setCurrentTab(1)} // Go to User Search
      >
        <PersonAdd />
      </Fab>
    </Container>
  );
};

export default Social;