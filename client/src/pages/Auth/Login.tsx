import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  SmartToy,
  Chat,
  Assignment,
  CalendarToday,
} from '@mui/icons-material';
import CustomGrid from '../../components/common/CustomGrid';
import { useAuth } from '../../hooks/useAuth';

const Grid = CustomGrid;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    profile: {
      position: '员工',
    },
  });

  const { login, register, loading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      // Error is handled in context
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 前端验证
    if (!registerData.username || registerData.username.length < 3) {
      return;
    }
    if (!registerData.email || !registerData.email.includes('@')) {
      return;
    }
    if (!registerData.password || registerData.password.length < 6) {
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      return;
    }
    
    try {
      const { confirmPassword, ...userData } = registerData;
      await register(userData);
    } catch (error) {
      // Error is handled in context
    }
  };

  const features = [
    {
      icon: <SmartToy color="primary" />,
      title: 'AI任务规划',
      description: '智能分析任务，提供多种执行方案',
    },
    {
      icon: <Chat color="primary" />,
      title: '微信集成',
      description: '通过微信随时管理工作任务',
    },
    {
      icon: <Assignment color="primary" />,
      title: '文档分析',
      description: '自动分析文档内容，提取关键信息',
    },
    {
      icon: <CalendarToday color="primary" />,
      title: '日程同步',
      description: '集成多平台日历，统一管理时间',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Left Side - Features */}
          <Grid item xs={12} md={6}>
            <Box sx={{ color: 'white', mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                智能工作助手
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                融入日常工作的AI助手，提升工作效率，智能管理任务
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card 
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      color: 'white',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {feature.icon}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {feature.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={24}
              sx={{
                p: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h4" component="h2" gutterBottom>
                  {isRegistering ? '注册账号' : '登录'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {isRegistering ? '创建您的智能工作助手账号' : '欢迎回到智能工作助手'}
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {!isRegistering ? (
                // Login Form
                <Box component="form" onSubmit={handleLogin}>
                  <TextField
                    fullWidth
                    label="邮箱地址"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="密码"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : '登录'}
                  </Button>

                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">
                      还没有账号？{' '}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => setIsRegistering(true)}
                      >
                        立即注册
                      </Link>
                    </Typography>
                  </Box>

                  {/* Demo Account Info */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="caption" display="block" gutterBottom>
                      演示账号：
                    </Typography>
                    <Typography variant="caption" display="block">
                      邮箱：demo@test.com
                    </Typography>
                    <Typography variant="caption" display="block">
                      密码：password123
                    </Typography>
                  </Box>
                </Box>
              ) : (
                // Register Form
                <Box component="form" onSubmit={handleRegister}>
                  <TextField
                    fullWidth
                    label="用户名"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    required
                    inputProps={{ minLength: 3, maxLength: 30 }}
                    helperText="用户名至少3-30个字符"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="邮箱地址"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    required
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="密码"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    required
                    inputProps={{ minLength: 6 }}
                    helperText="密码至少6个字符"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="确认密码"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    required
                    sx={{ mb: 3 }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : '注册'}
                  </Button>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">
                      已有账号？{' '}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => setIsRegistering(false)}
                      >
                        立即登录
                      </Link>
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Login;