import supabase from '../config/supabase';


const redirectTo = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL as string | undefined;

export const signInWithApple = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo },
  });
  if (error) throw new Error(error.message || 'Failed to sign in with Apple');
};

export const linkAppleAccount = async (): Promise<void> => {
  const { error } = await supabase.auth.linkIdentity({ provider: 'apple', options: { redirectTo } });
  if (error) throw new Error(error.message || 'Failed to link Apple account');
};
