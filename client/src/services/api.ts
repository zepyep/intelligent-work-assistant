import axios from 'axios';

// Base API configuration
// 优先使用环境变量，然后检查是否在Clacky环境或本地开发环境
const getApiBaseUrl = () => {
  // 1. 如果设置了明确的API URL环境变量，优先使用
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 2. 检查是否在Clacky环境（通过hostname或特定标识）
  const isClackyEnv = window.location.hostname.includes('clacky') || 
                     window.location.hostname.includes('codespace') ||
                     window.location.hostname.includes('github') ||
                     process.env.NODE_ENV !== 'production';
  
  // 3. 在Clacky或开发环境中使用代理（相对路径）
  if (isClackyEnv) {
    return '/api';
  }
  
  // 4. 其他生产环境使用相对路径
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging for API configuration
console.log('🔧 API Configuration:', {
  baseURL: API_BASE_URL,
  hostname: window.location.hostname,
  nodeEnv: process.env.NODE_ENV,
  customApiUrl: process.env.REACT_APP_API_URL
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data.data || response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  setAuthToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },

  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response;
  },

  async register(userData: any) {
    const response = await apiClient.post('/auth/register', userData);
    return response;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response;
  },

  async updateProfile(profileData: any) {
    const response = await apiClient.put('/auth/profile', profileData);
    return response;
  },

  async changePassword(passwords: { currentPassword: string; newPassword: string }) {
    const response = await apiClient.put('/auth/password', passwords);
    return response;
  },
};

// Tasks Service
export const tasksApi = {
  async getTasks(params?: any) {
    const response = await apiClient.get('/tasks', { params });
    return response;
  },

  async getTask(id: string) {
    const response = await apiClient.get(`/tasks/${id}`);
    return response;
  },

  async createTask(taskData: any) {
    const response = await apiClient.post('/tasks', taskData);
    return response;
  },

  async updateTask(id: string, taskData: any) {
    const response = await apiClient.put(`/tasks/${id}`, taskData);
    return response;
  },

  async deleteTask(id: string) {
    const response = await apiClient.delete(`/tasks/${id}`);
    return response;
  },

  async getTaskPlans(taskId: string) {
    const response = await apiClient.get(`/tasks/${taskId}/plans`);
    return response;
  },

  async generateTaskPlan(taskData: any) {
    const response = await apiClient.post('/ai/task-planning', taskData);
    return response;
  },

  async getTaskStatistics() {
    const response = await apiClient.get('/tasks/stats');
    return response;
  },
};

// Calendar Service
export const calendarApi = {
  async getEvents(params?: any) {
    const response = await apiClient.get('/calendar/events', { params });
    return response;
  },

  async getEvent(id: string) {
    const response = await apiClient.get(`/calendar/events/${id}`);
    return response;
  },

  async createEvent(eventData: any) {
    const response = await apiClient.post('/calendar/events', eventData);
    return response;
  },

  async updateEvent(id: string, eventData: any) {
    const response = await apiClient.put(`/calendar/events/${id}`, eventData);
    return response;
  },

  async deleteEvent(id: string) {
    const response = await apiClient.delete(`/calendar/events/${id}`);
    return response;
  },

  async getAvailability(date: string, duration: number, participants?: string[]) {
    const response = await apiClient.get('/calendar/availability', {
      params: { date, duration, participants: participants?.join(',') },
    });
    return response;
  },

  async importEvents(provider: string, dateRange?: any) {
    const response = await apiClient.post('/calendar/import', { provider, dateRange });
    return response;
  },

  async exportCalendar(startDate?: string, endDate?: string) {
    const response = await apiClient.get('/calendar/export', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    return response;
  },

  async getIntegrations() {
    const response = await apiClient.get('/calendar/integrations');
    return response;
  },

  async getAuthUrl(provider: string) {
    const response = await apiClient.get(`/calendar/auth/${provider}`);
    return response;
  },

  async getStats(period?: string) {
    const response = await apiClient.get('/calendar/stats', { params: { period } });
    return response;
  },
};

// Documents Service
export const documentsApi = {
  async getDocuments(params?: any) {
    const response = await apiClient.get('/documents', { params });
    return response;
  },

  async getDocument(id: string) {
    const response = await apiClient.get(`/documents/${id}`);
    return response;
  },

  async uploadDocument(file: File, metadata?: any) {
    const formData = new FormData();
    formData.append('document', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  async deleteDocument(id: string) {
    const response = await apiClient.delete(`/documents/${id}`);
    return response;
  },

  async downloadDocument(id: string) {
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  },

  async searchDocuments(query: string, filters?: any) {
    const response = await apiClient.get('/documents/search', {
      params: { query, ...filters },
    });
    return response;
  },

  async analyzeDocument(id: string) {
    const response = await apiClient.post(`/documents/${id}/analyze`);
    return response;
  },

  async getDocumentStats() {
    const response = await apiClient.get('/documents/stats');
    return response;
  },
};

// Meetings Service
export const meetingsApi = {
  async getMeetings(params?: any) {
    const response = await apiClient.get('/meetings', { params });
    return response;
  },

  async getMeeting(id: string) {
    const response = await apiClient.get(`/meetings/${id}`);
    return response;
  },

  async createMeeting(meetingData: any) {
    const response = await apiClient.post('/meetings', meetingData);
    return response;
  },

  async uploadAudio(file: File, metadata?: any) {
    const formData = new FormData();
    formData.append('audio', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    const response = await apiClient.post('/meetings/upload-audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  async processAudio(id: string) {
    const response = await apiClient.post(`/meetings/${id}/reanalyze`);
    return response;
  },

  async generateActionItems(id: string) {
    const response = await apiClient.post(`/meetings/${id}/action-items`);
    return response;
  },

  async updateMeeting(id: string, meetingData: any) {
    const response = await apiClient.put(`/meetings/${id}`, meetingData);
    return response;
  },

  async deleteMeeting(id: string) {
    const response = await apiClient.delete(`/meetings/${id}`);
    return response;
  },

  async getMeetingStats() {
    const response = await apiClient.get('/meetings/stats');
    return response;
  },
};

// WeChat Service
export const wechatApi = {
  async getBindingStatus() {
    const response = await apiClient.get('/wechat/bind/status');
    return response;
  },

  async generateBindingCode() {
    const response = await apiClient.post('/wechat/bind/generate');
    return response;
  },

  async unbindWeChat() {
    const response = await apiClient.delete('/wechat/bind');
    return response;
  },

  async getProfile() {
    const response = await apiClient.get('/wechat/profile');
    return response;
  },

  async sendMessage(openId: string, message: string, messageType?: string) {
    const response = await apiClient.post('/wechat/send-message', {
      openId,
      message,
      messageType,
    });
    return response;
  },
};

// AI Service
export const aiApi = {
  async generateText(prompt: string, options?: any) {
    const response = await apiClient.post('/ai/generate', { prompt, ...options });
    return response;
  },

  async analyzeText(text: string, analysisType?: string) {
    const response = await apiClient.post('/ai/analyze', { text, analysisType });
    return response;
  },

  async taskPlanning(taskDescription: string, userContext?: any) {
    const response = await apiClient.post('/ai/task-planning', {
      taskDescription,
      userContext,
    });
    return response;
  },

  async documentSummary(documentId: string) {
    const response = await apiClient.post(`/ai/document-summary/${documentId}`);
    return response;
  },

  async meetingAnalysis(meetingId: string) {
    const response = await apiClient.post(`/ai/meeting-analysis/${meetingId}`);
    return response;
  },
};

export default apiClient;