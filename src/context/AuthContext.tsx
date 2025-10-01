import type { User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AuthService from '../auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // Phone auth
  initializePhoneAuth: (containerId?: string) => void;
  sendPhoneVerification: (phoneNumber: string) => Promise<any>;
  verifyPhoneCode: (confirmationResult: any, code: string) => Promise<void>;
  cleanupPhoneAuth: () => void;
  // Account linking
  linkGoogle: () => Promise<void>;
  linkApple: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((authUser, accessToken) => {
      setUser(authUser);
      setToken(accessToken ?? null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithEmail(email, password);
      setUser(result.user);
      setToken(result.token);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username?: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await AuthService.signUpWithEmail(email, password, username || '');
      setUser(result.user);
      setToken(result.token);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.signInWithGoogle();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.signInWithApple();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
      setToken(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await AuthService.resetPassword(email);
    } catch (error) {
      throw error;
    }
  };

  // Phone auth methods
  const initializePhoneAuth = (containerId?: string): void => {
    AuthService.initializePhoneAuth(containerId);
  };

  const sendPhoneVerification = async (phoneNumber: string) => {
    try {
      return await AuthService.sendPhoneVerification(phoneNumber);
    } catch (error) {
      throw error;
    }
  };

  const verifyPhoneCode = async (confirmationResult: any, code: string): Promise<void> => {
    setLoading(true);
    try {
      const result = await AuthService.verifyPhoneCode(confirmationResult, code);
      setUser(result.user);
      setToken(result.token);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cleanupPhoneAuth = (): void => {
    AuthService.cleanupPhoneAuth();
  };

  // Account linking methods
  const linkGoogle = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.linkGoogle();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const linkApple = async (): Promise<void> => {
    setLoading(true);
    try {
      await AuthService.linkApple();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    initializePhoneAuth,
    sendPhoneVerification,
    verifyPhoneCode,
    cleanupPhoneAuth,
    linkGoogle,
    linkApple,
    setUser,
    setToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
