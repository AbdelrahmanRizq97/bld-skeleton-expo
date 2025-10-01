import type { User } from '@supabase/supabase-js';
import supabase from '../config/supabase';

export interface PhoneAuthResult { user: User; token: string }

export const initializeRecaptcha = (_containerId: string = 'recaptcha-container'): void => {
  // Not required for Supabase OTP
};

export const sendVerificationCode = async (phoneNumber: string): Promise<{ phone: string }> => {
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message || 'Failed to send verification code');
  return { phone: phoneNumber };
};

export const verifyCode = async (
  confirmation: { phone: string },
  verificationCode: string
): Promise<PhoneAuthResult> => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: confirmation.phone,
    token: verificationCode,
    type: 'sms',
  });
  if (error || !data.session || !data.user) {
    throw new Error(error?.message || 'Failed to verify code');
  }
  return { user: data.user as User, token: data.session.access_token };
};

export const cleanupRecaptcha = (): void => {
  // No-op for Supabase
};
