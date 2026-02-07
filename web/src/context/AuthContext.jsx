// Контекст авторизации — состояние пользователя, вход, регистрация, OTP, Google OAuth
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOtp, setPendingOtp] = useState(null); // { tempToken, email }

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        connectSocket(token);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    if (data.requireOtp) {
      setPendingOtp({ tempToken: data.tempToken, email });
      return data;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    if (data.requireOtp) {
      setPendingOtp({ tempToken: data.tempToken, email: formData.email });
      return data;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data;
  }, []);

  const verifyOtp = useCallback(async (otp) => {
    if (!pendingOtp) throw new Error('No pending OTP');
    const { data } = await authAPI.verifyOtp({ tempToken: pendingOtp.tempToken, otp });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setPendingOtp(null);
    connectSocket(data.token);
    return data;
  }, [pendingOtp]);

  const resendOtp = useCallback(async () => {
    if (!pendingOtp) throw new Error('No pending OTP');
    const { data } = await authAPI.resendOtp({ tempToken: pendingOtp.tempToken });
    return data;
  }, [pendingOtp]);

  const loginWithGoogle = useCallback(async (credential) => {
    const { data } = await authAPI.googleAuth({ credential });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    connectSocket(data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPendingOtp(null);
    disconnectSocket();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch {
      logout();
    }
  }, [logout]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    pendingOtp,
    login,
    register,
    verifyOtp,
    resendOtp,
    loginWithGoogle,
    logout,
    refreshUser,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
