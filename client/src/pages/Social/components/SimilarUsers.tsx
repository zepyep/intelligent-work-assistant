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
  LinearProgress,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  People,
  Psychology,
  Star,
  Business,
  Work,
  LocationOn,
  Message,
  Refresh,
} from '@mui/icons-material';

interface SimilarUser {
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
  similarityScore: number;
  commonSkills: string[];
}

const SimilarUsers: React.FC = () => {
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const fetchSimilarUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/social/similar-users?limit=${limit}`, {
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
        setSimilarUsers(data.data);
      } else {
        setError('Failed to fetch similar users');
      }
    } catch (err) {
      console.error('Error fetching similar users:', err);
      setError('Failed to fetch similar users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarUsers();
  }, []);

  const getSimilarityColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 80) return '高度相似';
    if (score >= 60) return '较为相似';
    if (score >= 40) return '一般相似';
    return '基础相似';
  };

  const SimilarUserCard: React.FC<{ similarUser: SimilarUser }> = ({ similarUser }) => {
    const { user, similarityScore, commonSkills } = similarUser;
    
    return (
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
          
          {/* Similarity Score */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                相似度
              </Typography>
              <Chip
                label={`${Math.round(similarityScore)}%`}
                color={getSimilarityColor(similarityScore)}
                size="small"
                icon={<Psychology />}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={similarityScore}
              color={getSimilarityColor(similarityScore)}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {getSimilarityLabel(similarityScore)}
            </Typography>
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
          
          {/* Common Skills */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              共同技能 ({commonSkills.length})
            </Typography>
            <Box>
              {commonSkills.slice(0, 5).map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
              {commonSkills.length > 5 && (
                <Chip
                  label={`+${commonSkills.length - 5}`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              )}
            </Box>
          </Box>
          
          {/* Bio */}
          <Typography variant="body2" color="text.secondary">
            {user.profile.bio?.length > 100 
              ? `${user.profile.bio.substring(0, 100)}...` 
              : user.profile.bio}
          </Typography>
        </CardContent>
        
        <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
          >
            查看档案
          </Button>
          {user.socialSettings.acceptCollaborations && (
            <Button
              variant="contained"
              startIcon={<Message />}
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
            相似用户
          </Typography>
          <Typography variant="body2" color="text.secondary">
            与您技能和背景相似的用户，适合交流学习和合作
          </Typography>
        </Box>
        <Tooltip title="刷新列表">
          <IconButton onClick={fetchSimilarUsers} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Similar Users Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {similarUsers.map((similarUser) => (
            <Grid item xs={12} sm={6} md={4} key={similarUser.user._id}>
              <SimilarUserCard similarUser={similarUser} />
            </Grid>
          ))}
          
          {similarUsers.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  暂无相似用户
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  完善您的个人档案和技能标签以找到更多相似用户
                </Typography>
                <Button
                  variant="outlined"
                  onClick={fetchSimilarUsers}
                  startIcon={<Refresh />}
                >
                  重新加载
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default SimilarUsers;