export interface User {
  id: string;
  username: string;
  email: string;
  profile: {
    fullName: string;
    position: string;
    avatar?: string;
  };
  wechatBinding: {
    isVerified: boolean;
    nickname?: string;
    avatar?: string;
    bindTime?: string;
  };
  settings: {
    language: string;
    timezone: string;
    theme: string;
    notifications: {
      email: boolean;
      wechat: boolean;
      system: boolean;
    };
  };
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  position?: string;
  department?: string;
}