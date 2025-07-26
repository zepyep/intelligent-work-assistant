import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Autocomplete,
  Slider,
  FormGroup,
  FormLabel,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Add,
  Delete,
  Visibility,
  VisibilityOff,
  Work,
  School,
  LocationOn,
  Language,
  Star,
  Business,
} from '@mui/icons-material';

interface SocialProfileProps {
  profile: any;
  onProfileUpdate: (profile: any) => void;
}

const skillSuggestions = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'TypeScript', 'Vue.js', 'Angular',
  'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'C++', 'C#', 'SQL', 'MongoDB',
  'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'Machine Learning', 'Data Science', 'AI', 'DevOps', 'CI/CD', 'Git', 'Linux',
  'UI/UX Design', 'Product Management', 'Project Management', 'Agile', 'Scrum',
  'Marketing', 'Sales', 'Business Analysis', 'Consulting', 'Strategy'
];

const industries = [
  '互联网/软件', '金融/银行', '制造业', '医疗健康', '教育/培训', '咨询/服务',
  '媒体/广告', '零售/电商', '房地产', '政府/非营利', '能源/环境', '交通/物流'
];

const SocialProfile: React.FC<SocialProfileProps> = ({ profile, onProfileUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => ({
    // Personal Info
    fullName: profile?.profile?.fullName || '',
    position: profile?.profile?.position || '',
    location: profile?.profile?.location || '',
    bio: profile?.profile?.bio || '',
    
    // Professional Info
    company: profile?.profile?.company || '',
    industry: profile?.profile?.industry || '',
    experience: profile?.profile?.experience || 0,
    skills: profile?.profile?.skills || [],
    
    // Work Experience
    workExperience: profile?.profile?.workExperience || [],
    
    // Education
    education: profile?.profile?.education || [],
    
    // Contact
    email: profile?.profile?.email || '',
    phone: profile?.profile?.phone || '',
    linkedin: profile?.profile?.linkedin || '',
    github: profile?.profile?.github || '',
    website: profile?.profile?.website || '',
    
    // Social Settings
    socialSettings: {
      isPublic: profile?.socialSettings?.isPublic ?? true,
      acceptCollaborations: profile?.socialSettings?.acceptCollaborations ?? true,
      showContactInfo: profile?.socialSettings?.showContactInfo ?? false,
      privacy: {
        showExperience: profile?.socialSettings?.privacy?.showExperience ?? true,
        showEducation: profile?.socialSettings?.privacy?.showEducation ?? true,
        showContact: profile?.socialSettings?.privacy?.showContact ?? false,
      }
    },
    
    // Collaboration Preferences
    collaborationPreferences: {
      preferredProjectTypes: profile?.collaborationPreferences?.preferredProjectTypes || [],
      availability: profile?.collaborationPreferences?.availability || 'part-time',
      hourlyRate: profile?.collaborationPreferences?.hourlyRate || 0,
      currency: profile?.collaborationPreferences?.currency || 'CNY',
      remoteWork: profile?.collaborationPreferences?.remoteWork ?? true,
    }
  }));

  const handleEdit = () => {
    setEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form data
    setFormData({
      fullName: profile?.profile?.fullName || '',
      position: profile?.profile?.position || '',
      location: profile?.profile?.location || '',
      bio: profile?.profile?.bio || '',
      company: profile?.profile?.company || '',
      industry: profile?.profile?.industry || '',
      experience: profile?.profile?.experience || 0,
      skills: profile?.profile?.skills || [],
      workExperience: profile?.profile?.workExperience || [],
      education: profile?.profile?.education || [],
      email: profile?.profile?.email || '',
      phone: profile?.profile?.phone || '',
      linkedin: profile?.profile?.linkedin || '',
      github: profile?.profile?.github || '',
      website: profile?.profile?.website || '',
      socialSettings: {
        isPublic: profile?.socialSettings?.isPublic ?? true,
        acceptCollaborations: profile?.socialSettings?.acceptCollaborations ?? true,
        showContactInfo: profile?.socialSettings?.showContactInfo ?? false,
        privacy: {
          showExperience: profile?.socialSettings?.privacy?.showExperience ?? true,
          showEducation: profile?.socialSettings?.privacy?.showEducation ?? true,
          showContact: profile?.socialSettings?.privacy?.showContact ?? false,
        }
      },
      collaborationPreferences: {
        preferredProjectTypes: profile?.collaborationPreferences?.preferredProjectTypes || [],
        availability: profile?.collaborationPreferences?.availability || 'part-time',
        hourlyRate: profile?.collaborationPreferences?.hourlyRate || 0,
        currency: profile?.collaborationPreferences?.currency || 'CNY',
        remoteWork: profile?.collaborationPreferences?.remoteWork ?? true,
      }
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/social/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            fullName: formData.fullName,
            position: formData.position,
            location: formData.location,
            bio: formData.bio,
            company: formData.company,
            industry: formData.industry,
            experience: formData.experience,
            skills: formData.skills,
            workExperience: formData.workExperience,
            education: formData.education,
            email: formData.email,
            phone: formData.phone,
            linkedin: formData.linkedin,
            github: formData.github,
            website: formData.website,
          },
          socialSettings: formData.socialSettings,
          collaborationPreferences: formData.collaborationPreferences,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        onProfileUpdate(data.data);
        setEditing(false);
      } else {
        setError('Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFieldChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">基本信息</Typography>
              <Box>
                {editing ? (
                  <>
                    <Button
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      sx={{ mr: 1 }}
                    >
                      取消
                    </Button>
                    <Button
                      startIcon={<Save />}
                      variant="contained"
                      onClick={handleSave}
                      disabled={loading}
                    >
                      保存
                    </Button>
                  </>
                ) : (
                  <Button
                    startIcon={<Edit />}
                    onClick={handleEdit}
                  >
                    编辑
                  </Button>
                )}
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="姓名"
                  value={formData.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="职位"
                  value={formData.position}
                  onChange={(e) => handleFieldChange('position', e.target.value)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="公司"
                  value={formData.company}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={industries}
                  value={formData.industry}
                  onChange={(e, value) => handleFieldChange('industry', value)}
                  disabled={!editing}
                  renderInput={(params) => (
                    <TextField {...params} label="行业" fullWidth />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="工作地点"
                  value={formData.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="工作经验（年）"
                  type="number"
                  value={formData.experience}
                  onChange={(e) => handleFieldChange('experience', parseInt(e.target.value) || 0)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="个人简介"
                  multiline
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => handleFieldChange('bio', e.target.value)}
                  disabled={!editing}
                  placeholder="介绍一下您的专业背景和职业目标..."
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={skillSuggestions}
                  value={formData.skills}
                  onChange={(e, value) => handleFieldChange('skills', value)}
                  disabled={!editing}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="专业技能"
                      placeholder="添加技能标签..."
                      fullWidth
                    />
                  )}
                  freeSolo
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Contact Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              联系方式
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="邮箱"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="电话"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="LinkedIn"
                  value={formData.linkedin}
                  onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                  disabled={!editing}
                  placeholder="https://linkedin.com/in/username"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GitHub"
                  value={formData.github}
                  onChange={(e) => handleFieldChange('github', e.target.value)}
                  disabled={!editing}
                  placeholder="https://github.com/username"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="个人网站"
                  value={formData.website}
                  onChange={(e) => handleFieldChange('website', e.target.value)}
                  disabled={!editing}
                  placeholder="https://yourwebsite.com"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Settings Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Privacy Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              隐私设置
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.socialSettings.isPublic}
                    onChange={(e) => 
                      handleNestedFieldChange('socialSettings', 'isPublic', e.target.checked)
                    }
                    disabled={!editing}
                  />
                }
                label="公开个人档案"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.socialSettings.acceptCollaborations}
                    onChange={(e) => 
                      handleNestedFieldChange('socialSettings', 'acceptCollaborations', e.target.checked)
                    }
                    disabled={!editing}
                  />
                }
                label="接受合作邀请"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.socialSettings.privacy.showExperience}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        socialSettings: {
                          ...prev.socialSettings,
                          privacy: {
                            ...prev.socialSettings.privacy,
                            showExperience: e.target.checked
                          }
                        }
                      }))
                    }
                    disabled={!editing}
                  />
                }
                label="显示工作经历"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.socialSettings.privacy.showEducation}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        socialSettings: {
                          ...prev.socialSettings,
                          privacy: {
                            ...prev.socialSettings.privacy,
                            showEducation: e.target.checked
                          }
                        }
                      }))
                    }
                    disabled={!editing}
                  />
                }
                label="显示教育背景"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.socialSettings.privacy.showContact}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        socialSettings: {
                          ...prev.socialSettings,
                          privacy: {
                            ...prev.socialSettings.privacy,
                            showContact: e.target.checked
                          }
                        }
                      }))
                    }
                    disabled={!editing}
                  />
                }
                label="显示联系方式"
              />
            </FormGroup>
          </Paper>

          {/* Collaboration Preferences */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              合作偏好
            </Typography>
            <Box sx={{ mb: 2 }}>
              <FormLabel component="legend">可用时间</FormLabel>
              <Autocomplete
                value={formData.collaborationPreferences.availability}
                onChange={(e, value) => 
                  handleNestedFieldChange('collaborationPreferences', 'availability', value)
                }
                disabled={!editing}
                options={['full-time', 'part-time', 'contract', 'freelance']}
                getOptionLabel={(option) => {
                  const labels: Record<string, string> = {
                    'full-time': '全职',
                    'part-time': '兼职',
                    'contract': '合同制',
                    'freelance': '自由职业'
                  };
                  return labels[option] || option;
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" fullWidth />
                )}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <FormLabel component="legend">时薪期望 (CNY)</FormLabel>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.collaborationPreferences.hourlyRate}
                onChange={(e) => 
                  handleNestedFieldChange('collaborationPreferences', 'hourlyRate', parseInt(e.target.value) || 0)
                }
                disabled={!editing}
                sx={{ mt: 1 }}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.collaborationPreferences.remoteWork}
                  onChange={(e) => 
                    handleNestedFieldChange('collaborationPreferences', 'remoteWork', e.target.checked)
                  }
                  disabled={!editing}
                />
              }
              label="支持远程工作"
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SocialProfile;