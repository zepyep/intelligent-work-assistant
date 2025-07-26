import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  Error,
  Warning,
  Info,
  Settings,
  Science as TestTube,
  Save,
  Refresh,
  Download,
  Upload,
  RestartAlt as Reset,
  Help
} from '@mui/icons-material';
import { useApi } from '../../contexts/ApiContext';

interface WechatConfigStatus {
  configured: boolean;
  appId: string;
  appSecret: string;
  token: string;
  encodingAESKey: string;
  serverUrl: string;
  lastUpdated: string;
  validation: {
    valid: boolean;
    message: string;
    missingFields?: string[];
  };
}

interface WizardStep {
  step: number;
  title: string;
  description: string;
  completed: boolean;
  instructions: string[];
}

interface WizardData {
  steps: WizardStep[];
  currentStep: number;
  totalSteps: number;
  overallProgress: number;
}

const WechatConfig: React.FC = () => {
  const api = useApi();
  const [configStatus, setConfigStatus] = useState<WechatConfigStatus | null>(null);
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [formData, setFormData] = useState({
    appId: '',
    appSecret: '',
    token: '',
    encodingAESKey: '',
    serverUrl: ''
  });

  useEffect(() => {
    loadConfigData();
  }, []);

  const loadConfigData = async () => {
    try {
      setLoading(true);
      
      // Mock data for development
      setConfigStatus({
        configured: false,
        appId: '',
        appSecret: '',
        token: '',
        encodingAESKey: '',
        serverUrl: 'https://your-domain.com/api/wechat/webhook',
        lastUpdated: new Date().toISOString(),
        validation: {
          valid: false,
          message: '请完善微信公众号基础配置',
          missingFields: ['appId', 'appSecret', 'token']
        }
      });
      
      setWizardData({
        steps: [
          {
            step: 1,
            title: '获取微信公众号凭据',
            description: '从微信公众平台获取AppID和AppSecret',
            completed: false,
            instructions: [
              '登录微信公众平台 https://mp.weixin.qq.com',
              '进入 开发 > 基本配置',
              '获取AppID和AppSecret'
            ]
          },
          {
            step: 2,
            title: '配置服务器信息',
            description: '设置Token和服务器URL',
            completed: false,
            instructions: [
              '设置自定义Token（英文或数字，长度为3-32字符）',
              '配置服务器URL（本系统提供的webhook地址）',
              '选择消息加解密方式'
            ]
          },
          {
            step: 3,
            title: '测试连接',
            description: '验证配置是否正确',
            completed: false,
            instructions: [
              '保存配置信息',
              '点击测试连接按钮',
              '确保连接成功'
            ]
          }
        ],
        currentStep: 1,
        totalSteps: 3,
        overallProgress: 0
      });
      
    } catch (error) {
      console.error('加载配置数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    try {
      setSaveLoading(true);
      
      // Mock save for development
      console.log('保存微信配置:', formData);
      
      setTimeout(() => {
        alert('微信配置保存成功！');
        loadConfigData();
      }, 1000);
    } catch (error: any) {
      console.error('保存配置失败:', error);
      alert(`保存配置失败: ${error.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestLoading(true);
      
      // Mock test for development
      setTimeout(() => {
        setTestResult({
          success: true,
          message: '微信服务器连接测试成功',
          data: {
            timestamp: new Date().toISOString(),
            responseTime: '150ms',
            status: 'connected'
          }
        });
      }, 2000);
    } catch (error: any) {
      console.error('测试连接失败:', error);
      setTestResult({
        success: false,
        message: error.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setFormData({
        appId: '',
        appSecret: '',
        token: '',
        encodingAESKey: '',
        serverUrl: ''
      });
      
      alert('配置已重置为默认状态');
      setShowResetDialog(false);
      await loadConfigData();
    } catch (error: any) {
      console.error('重置配置失败:', error);
      alert(`重置配置失败: ${error.message}`);
    }
  };

  const getStatusChip = (value: string) => {
    if (value && value !== '未配置') {
      return <Chip icon={<CheckCircle />} label="已配置" color="success" size="small" />;
    } else {
      return <Chip icon={<Error />} label="未配置" color="error" size="small" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings />
        微信公众号配置管理
      </Typography>

      {/* 配置状态概览 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          配置状态概览
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  基本配置
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">AppID:</Typography>
                    {getStatusChip(formData.appId)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">AppSecret:</Typography>
                    {getStatusChip(formData.appSecret)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">Token:</Typography>
                    {getStatusChip(formData.token)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  整体状态
                </Typography>
                {formData.appId && formData.appSecret && formData.token ? (
                  <Alert severity="success">
                    <AlertTitle>配置完整</AlertTitle>
                    微信公众号配置已完成，可以正常使用
                  </Alert>
                ) : (
                  <Alert severity="error">
                    <AlertTitle>配置不完整</AlertTitle>
                    请完善微信公众号基础配置
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 配置向导 */}
      {wizardData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            配置向导 ({wizardData.overallProgress}% 完成)
          </Typography>
          
          <LinearProgress 
            variant="determinate" 
            value={wizardData.overallProgress} 
            sx={{ mb: 2 }}
          />
          
          <Stepper activeStep={wizardData.currentStep - 1} orientation="vertical">
            {wizardData.steps.map((step, index) => (
              <Step key={index} completed={step.completed}>
                <StepLabel>
                  <Typography variant="subtitle1">{step.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <List dense>
                    {step.instructions.map((instruction, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          {step.completed ? <CheckCircle color="success" /> : <Info color="action" />}
                        </ListItemIcon>
                        <ListItemText primary={instruction} />
                      </ListItem>
                    ))}
                  </List>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {/* 配置表单 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          配置参数
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="AppID"
              name="appId"
              value={formData.appId}
              onChange={handleInputChange}
              placeholder="输入微信公众号AppID"
              helperText="从微信公众平台 > 开发 > 基本配置 获取"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="password"
              label="AppSecret"
              name="appSecret"
              value={formData.appSecret}
              onChange={handleInputChange}
              placeholder="输入微信公众号AppSecret"
              helperText="从微信公众平台 > 开发 > 基本配置 获取"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Token"
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              placeholder="设置自定义Token"
              helperText="用于验证消息来源，建议使用随机字符串"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="EncodingAESKey (可选)"
              name="encodingAESKey"
              value={formData.encodingAESKey}
              onChange={handleInputChange}
              placeholder="输入消息加解密密钥"
              helperText="如果选择安全模式，需要配置此项"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="服务器URL"
              name="serverUrl"
              value={formData.serverUrl}
              onChange={handleInputChange}
              placeholder="https://yourdomain.com/api/wechat/webhook"
              helperText="在微信公众平台配置此URL地址"
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveConfig}
            disabled={saveLoading || !formData.appId || !formData.appSecret || !formData.token}
          >
            {saveLoading ? '保存中...' : '保存配置'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<TestTube />}
            onClick={handleTestConnection}
            disabled={testLoading || !formData.appId || !formData.appSecret || !formData.token}
          >
            {testLoading ? '测试中...' : '测试连接'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadConfigData}
          >
            刷新状态
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<Reset />}
            onClick={() => setShowResetDialog(true)}
          >
            重置配置
          </Button>
        </Box>
      </Paper>

      {/* 测试结果 */}
      {testResult && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            连接测试结果
          </Typography>
          
          <Alert severity={testResult.success ? 'success' : 'error'}>
            <AlertTitle>{testResult.success ? '测试成功' : '测试失败'}</AlertTitle>
            {testResult.message}
          </Alert>
          
          {testResult.success && testResult.data && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>详细信息</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre style={{ fontSize: '0.875rem', overflow: 'auto' }}>
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>
      )}

      {/* 重置确认对话框 */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogTitle>确认重置配置</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            此操作将重置所有微信配置为默认状态，原配置将备份保存。
          </Alert>
          <Typography>
            您确定要重置所有微信配置吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleReset}>
            确认重置
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WechatConfig;