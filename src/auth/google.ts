import { Platform } from 'react-native';
import supabase from '../config/supabase';

const OAUTH_REDIRECT_BASE = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_BASE as string; // e.g., https://auth.yourdomain.com/callback (your Edge Function URL)
const APP_ID = process.env.EXPO_PUBLIC_APP_ID as string;                           // unique per generated app
const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID as (string | undefined);       // optional; pass when known

function buildRedirectTo(target?: 'web' | 'native', next?: string) {
  if (!OAUTH_REDIRECT_BASE || !APP_ID) {
    throw new Error('Missing EXPO_PUBLIC_OAUTH_REDIRECT_BASE or EXPO_PUBLIC_APP_ID');
  }
  const u = new URL(OAUTH_REDIRECT_BASE);
  u.searchParams.set('app', APP_ID);
  if (TENANT_ID) u.searchParams.set('tenant', TENANT_ID);
  if (target) u.searchParams.set('target', target);
  if (next) u.searchParams.set('next', next);
  return u.toString();
}

export const signInWithGoogle = async (next?: string): Promise<void> => {
  const target = Platform.OS === 'web' ? 'web' : 'native';
  const redirectTo = buildRedirectTo(target, next);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw new Error(error.message || 'Failed to sign in with Google');
};

export const linkGoogleAccount = async (next?: string): Promise<void> => {
  const target = Platform.OS === 'web' ? 'web' : 'native';
  const redirectTo = buildRedirectTo(target, next);
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw new Error(error.message || 'Failed to link Google account');
};