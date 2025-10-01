import type { User } from '@supabase/supabase-js';
import supabase from '../config/supabase';

export interface AuthResult {
  user: User;
  token: string;
}

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message || 'Failed to sign in with email');
  }
  return { user: data.user as User, token: data.session.access_token };
};

export const signUp = async (email: string, password: string, username: string): Promise<AuthResult> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });
  if (error || !data.user) {
    throw new Error(error?.message || 'Failed to create account');
  }
  // When email confirmations are enabled, there may be no session yet
  const token = data.session?.access_token || '';
  return { user: data.user as User, token };
};

export const resetPassword = async (email: string): Promise<void> => {
  const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL as string | undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message || 'Failed to sign out');
  }
};
