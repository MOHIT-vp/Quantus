import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pipelineiq_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('pipelineiq_token')
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('pipelineiq_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem('pipelineiq_token');
          localStorage.removeItem('pipelineiq_user');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('pipelineiq_token', newToken);
    localStorage.setItem('pipelineiq_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pipelineiq_token');
    localStorage.removeItem('pipelineiq_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, login, logout, isLoading,
      isManager: user?.role === 'SALES_MANAGER' 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
