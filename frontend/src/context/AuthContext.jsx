import React, { createContext, useContext, useState } from 'react';
import { loginUser as apiLoginUser, registerUser as apiRegisterUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('campus_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error parsing stored user:', e);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await apiLoginUser({ email, password });
      setUser(userData);
      localStorage.setItem('campus_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await apiRegisterUser({ name, email, password });
      setUser(userData);
      localStorage.setItem('campus_user', JSON.stringify(userData));
      return userData;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('campus_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
