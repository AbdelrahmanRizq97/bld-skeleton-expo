// Unified Auth API (Supabase)
import type { User } from '@supabase/supabase-js';
import supabase from '../config/supabase';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

// Email auth
import {
  signIn as emailSignIn,
  signOut as emailSignOut,
  signUp as emailSignUp,
  resetPassword
} from './email';

// Phone auth
import {
  cleanupRecaptcha,
  initializeRecaptcha,
  sendVerificationCode,
  verifyCode
} from './phone';

// Google auth
import {
  linkGoogleAccount,
  signInWithGoogle
} from './google';

// Apple auth
import {
  linkAppleAccount,
  signInWithApple
} from './apple';

export interface UnifiedAuthResult { user: User; token: string; provider: 'email' | 'phone' | 'google' | 'apple' }

async function ensureMembershipIfTenantKnown(): Promise<void> {
  const tenantSlug = process.env.EXPO_PUBLIC_TENANT_ID;
  if (!tenantSlug) return;
  try {
    await supabase.functions.invoke('ensure-membership', {
      body: { tenantSlug },
    });
  } catch {
    // ignore; optional best-effort
  }
}

// Handles native deep-link callback:
// - If tokens arrive via hash (#access_token, #refresh_token): setSession
// - If PKCE code arrives via ?code=...: exchangeCodeForSession
export async function handleOAuthRedirect(url: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const u = new URL(url);
    const hash = u.hash && u.hash.startsWith('#') ? u.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const access_token = hashParams.get('access_token') || undefined;
    const refresh_token = hashParams.get('refresh_token') || undefined;
    const code = u.searchParams.get('code') || undefined;

    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      await ensureMembershipIfTenantKnown();
      return;
    }
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      await ensureMembershipIfTenantKnown();
      return;
    }
  } catch {
    // ignore parse errors; URL may not be for auth
  }
}

export class AuthService {
  // Email methods
  static async signInWithEmail(email: string, password: string): Promise<UnifiedAuthResult> {
    const result = await emailSignIn(email, password);
    return { ...result, provider: 'email' };
  }

  static async signUpWithEmail(email: string, password: string, username: string): Promise<UnifiedAuthResult> {
    const result = await emailSignUp(email, password, username);
    return { ...result, provider: 'email' };
  }

  static async resetPassword(email: string): Promise<void> {
    return resetPassword(email);
  }

  // Phone methods
  static initializePhoneAuth(containerId?: string): void {
    initializeRecaptcha(containerId);
  }

  static async sendPhoneVerification(phoneNumber: string) {
    return sendVerificationCode(phoneNumber);
  }

  static async verifyPhoneCode(confirmationResult: any, code: string): Promise<UnifiedAuthResult> {
    const result = await verifyCode(confirmationResult, code);
    return { ...result, provider: 'phone' };
  }

  static cleanupPhoneAuth(): void {
    cleanupRecaptcha();
  }

  // Google methods
  static async signInWithGoogle(next?: string): Promise<void> {
    await signInWithGoogle(next);
  }

  static async linkGoogle(next?: string): Promise<void> {
    await linkGoogleAccount(next);
  }

  // Apple methods
  static async signInWithApple(): Promise<void> {
    await signInWithApple();
  }

  static async linkApple(): Promise<void> {
    await linkAppleAccount();
  }

  // Common methods
  static async signOut(): Promise<void> {
    return emailSignOut();
  }

  static async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }

  static async getCurrentToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  static onAuthStateChanged(callback: (user: User | null, token: string | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null, session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }

  // Call this once at app start (native) to auto-complete OAuth on deep link
  static subscribeToOAuthRedirects() {
    if (Platform.OS === 'web') return () => {};
    const sub = Linking.addEventListener('url', ({ url }) => { handleOAuthRedirect(url); });
    Linking.getInitialURL().then((u) => { if (u) handleOAuthRedirect(u); });
    return () => sub.remove();
  }
}

// Export individual modules for direct use
export * from './apple';
export * from './email';
export * from './google';
export * from './phone';

// Export the unified service as default
export default AuthService;