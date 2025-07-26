import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  CloudUpload,
  Assessment,
  TrendingUp,
  Psychology,
  ShowChart,
  WorkOutline,
  School,
  EmojiEvents
} from '@mui/icons-material';
import api from '../../../services/api';

interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
  achievements: string[];
}

interface AnalysisResult {
  score: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  skillsGap: string[];
  marketPosition: string;
  careerPath: string[];
}

const ResumeAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingAnalysis();
  }, []);

  const fetchExistingAnalysis = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/social/resume-analysis');
      if (response.data.success) {
        setResumeData(response.data.resumeData);
        setAnalysisResult(response.data.analysis);
      }
    } catch (error: any) {
      console.error('Failed to fetch resume analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setAnalyzing(true);
      setError(null);

      const response = await api.post('/api/social/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setResumeData(response.data.resumeData);
        setAnalysisResult(response.data.analysis);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to analyze resume');
    } finally {
      setAnalyzing(false);
    }
  };

  const regenerateAnalysis = async () => {
    if (!resumeData) return;

    try {
      setAnalyzing(true);
      const response = await api.post('/api/social/regenerate-analysis');
      
      if (response.data.success) {
        setAnalysisResult(response.data.analysis);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to regenerate analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        Resume Analysis
      </Typography>

      {!resumeData ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CloudUpload sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>
              Upload Your Resume for AI Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Get personalized insights, skill assessments, and career recommendations
            </Typography>
            
            <input
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              id="resume-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={analyzing}
            />
            <label htmlFor="resume-upload">
              <Button
                variant="contained"
                component="span"
                disabled={analyzing}
                startIcon={analyzing ? <CircularProgress size={20} /> : <CloudUpload />}
              >
                {analyzing ? 'Analyzing...' : 'Upload Resume'}
              </Button>
            </label>

            {error && (
              <Alert severity="error" sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* Resume Overview */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Assessment sx={{ mr: 1 }} />
                  Resume Overview
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1">{resumeData.personalInfo.name}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Experience
                  </Typography>
                  <Typography variant="body2">
                    {resumeData.experience.length} positions
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Education
                  </Typography>
                  <Typography variant="body2">
                    {resumeData.education.length} degrees
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Key Skills
                  </Typography>
                  <Box>
                    {resumeData.skills.slice(0, 5).map((skill, index) => (
                      <Chip
                        key={index}
                        label={skill}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                    {resumeData.skills.length > 5 && (
                      <Typography variant="caption" color="text.secondary">
                        +{resumeData.skills.length - 5} more
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={regenerateAnalysis}
                  disabled={analyzing}
                  startIcon={analyzing ? <CircularProgress size={20} /> : <Psychology />}
                >
                  {analyzing ? 'Analyzing...' : 'Regenerate Analysis'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Analysis Results */}
          <Grid item xs={12} md={8}>
            {analysisResult && (
              <Grid container spacing={3}>
                {/* Overall Score */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <TrendingUp sx={{ mr: 1 }} />
                        Overall Resume Score
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ width: '100%', mr: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={analysisResult.score}
                            color={getScoreColor(analysisResult.score)}
                            sx={{ height: 10, borderRadius: 5 }}
                          />
                        </Box>
                        <Typography variant="h5" color={`${getScoreColor(analysisResult.score)}.main`}>
                          {analysisResult.score}%
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        Market Position: {analysisResult.marketPosition}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Strengths */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <EmojiEvents sx={{ mr: 1, color: 'success.main' }} />
                        Strengths
                      </Typography>
                      
                      <List dense>
                        {analysisResult.strengths.map((strength, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon>
                              <ShowChart sx={{ color: 'success.main' }} />
                            </ListItemIcon>
                            <ListItemText primary={strength} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Areas for Improvement */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                        Areas for Improvement
                      </Typography>
                      
                      <List dense>
                        {analysisResult.improvements.map((improvement, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon>
                              <WorkOutline sx={{ color: 'warning.main' }} />
                            </ListItemIcon>
                            <ListItemText primary={improvement} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Skills Gap */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <School sx={{ mr: 1, color: 'info.main' }} />
                        Skills Gap Analysis
                      </Typography>
                      
                      {analysisResult.skillsGap.length > 0 ? (
                        <Box>
                          {analysisResult.skillsGap.map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              variant="outlined"
                              color="info"
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No significant skills gaps identified
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Career Path Recommendations */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <Psychology sx={{ mr: 1, color: 'primary.main' }} />
                        Career Path Suggestions
                      </Typography>
                      
                      <List dense>
                        {analysisResult.careerPath.map((path, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemText primary={path} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recommendations */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Personalized Recommendations
                      </Typography>
                      
                      <Grid container spacing={2}>
                        {analysisResult.recommendations.map((recommendation, index) => (
                          <Grid item xs={12} md={6} key={index}>
                            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                              <Typography variant="body2">
                                {recommendation}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {analyzing && (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="h6">
                    Analyzing Resume with AI...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This may take a moment while we process your resume
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ResumeAnalysis;