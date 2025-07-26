import React, { createContext, useContext } from 'react';
import { 
  tasksApi, 
  calendarApi, 
  documentsApi, 
  meetingsApi, 
  wechatApi,
  aiApi,
  apiClient 
} from '../services/api';

interface ApiContextType {
  // HTTP Methods for simple usage
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
  put: (url: string, data?: any, config?: any) => Promise<any>;
  patch: (url: string, data?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
  
  // Structured services
  tasks: typeof tasksApi;
  calendar: typeof calendarApi;
  documents: typeof documentsApi;
  meetings: typeof meetingsApi;
  wechat: typeof wechatApi;
  ai: typeof aiApi;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiServices: ApiContextType = {
    // HTTP methods
    get: (url: string, config?: any) => apiClient.get(url, config),
    post: (url: string, data?: any, config?: any) => apiClient.post(url, data, config),
    put: (url: string, data?: any, config?: any) => apiClient.put(url, data, config),
    patch: (url: string, data?: any, config?: any) => apiClient.patch(url, data, config),
    delete: (url: string, config?: any) => apiClient.delete(url, config),
    
    // Structured services
    tasks: tasksApi,
    calendar: calendarApi,
    documents: documentsApi,
    meetings: meetingsApi,
    wechat: wechatApi,
    ai: aiApi,
  };

  return (
    <ApiContext.Provider value={apiServices}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export default ApiContext;