import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import { authApi, RefreshTokenResponse } from '@api/authApi';
import { AxiosResponse } from 'axios';

export interface User {
  id: number;
  employeeId: string;
  email: string;
  role: string;
  department: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (accessToken && refreshToken) {
      void refreshUser();
    }
  }, []);

  const login = (
    tokens: { accessToken: string; refreshToken: string },
    userData: User
  ) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshUser = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        const response: AxiosResponse<RefreshTokenResponse> =
          await authApi.refreshToken({ refreshToken });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.tokens;
        const userData = response.data.employee;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};