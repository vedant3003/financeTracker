'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  balance: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('financeTrackerUser');
    const storedCredentials = localStorage.getItem('financeTrackerCredentials');
    
    if (storedUser && storedCredentials) {
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const login = async (userId: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const userData = await response.json();
      setUser(userData);
      
      // Store user data and credentials in localStorage
      localStorage.setItem('financeTrackerUser', JSON.stringify(userData));
      localStorage.setItem('financeTrackerCredentials', JSON.stringify({ user_id: userId, password }));
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('financeTrackerUser');
    localStorage.removeItem('financeTrackerCredentials');
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        isViewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
