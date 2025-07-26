import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  Assignment,
  CalendarToday,
  Description,
  VideoCall,
  Chat,
  Person,
  Notifications,
  People,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    text: '仪表板',
    icon: <Dashboard />,
    path: '/dashboard',
    description: '总览与统计',
  },
  {
    text: '任务管理',
    icon: <Assignment />,
    path: '/tasks',
    description: 'AI任务规划',
    badge: 'AI',
  },
  {
    text: '日程安排',
    icon: <CalendarToday />,
    path: '/calendar',
    description: '日程同步',
  },
  {
    text: '文档分析',
    icon: <Description />,
    path: '/documents',
    description: '智能分析',
    badge: 'AI',
  },
  {
    text: '会议助手',
    icon: <VideoCall />,
    path: '/meetings',
    description: '录音分析',
    badge: 'AI',
  },
  {
    text: '微信助手',
    icon: <Chat />,
    path: '/wechat',
    description: '智能对话',
    badge: 'WeChat',
  },
  {
    text: '社交网络',
    icon: <People />,
    path: '/social',
    description: '专业社交',
    badge: 'NEW',
  },
  {
    text: '通知中心',
    icon: <Notifications />,
    path: '/notifications',
    description: '消息推送',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const drawerWidth = 240;
  const miniDrawerWidth = 64;

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? drawerWidth : miniDrawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: open ? drawerWidth : miniDrawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s',
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar />
      
      {/* User Info Section */}
      {open && (
        <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white' }}>
          <Typography variant="subtitle2" gutterBottom>
            欢迎回来
          </Typography>
          <Typography variant="h6" noWrap>
            {user?.profile.fullName || user?.username}
          </Typography>
          <Typography variant="caption" display="block">
            {user?.profile.position}
          </Typography>
          {user?.wechatBinding.isVerified && (
            <Chip
              label="微信已绑定"
              size="small"
              color="secondary"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
      )}

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                  color: location.pathname === item.path ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              
              {open && (
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ListItemText 
                      primary={item.text}
                      sx={{ 
                        opacity: 1,
                        '& .MuiListItemText-primary': {
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        },
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: 20,
                          fontSize: '0.7rem',
                          color: location.pathname === item.path ? 'white' : 'primary.main',
                          borderColor: location.pathname === item.path ? 'white' : 'primary.main',
                        }}
                      />
                    )}
                  </Box>
                  <Typography 
                    variant="caption" 
                    color={location.pathname === item.path ? 'rgba(255,255,255,0.8)' : 'text.secondary'}
                    sx={{ display: 'block', mt: 0.25 }}
                  >
                    {item.description}
                  </Typography>
                </Box>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Bottom Section */}
      <Box sx={{ p: open ? 2 : 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavigation('/profile')}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: open ? 2.5 : 1,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
              }}
            >
              <Person />
            </ListItemIcon>
            {open && <ListItemText primary="个人设置" />}
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default Sidebar;