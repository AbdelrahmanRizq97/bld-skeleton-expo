import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const APP_ID = process.env.EXPO_PUBLIC_APP_ID;
  if (!APP_ID) throw new Error('EXPO_PUBLIC_APP_ID is required');

  const NAME = process.env.EXPO_PUBLIC_APP_NAME || config.name || `App ${APP_ID}`;
  const SLUG = config.slug ?? `app-${APP_ID}`;

  return {
    ...config,
    name: NAME,            // ensure required string
    slug: SLUG,            // ensure required string
    version: config.version ?? '1.0.0',
    scheme: `myapp-${APP_ID}`,
    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: config.ios?.bundleIdentifier ?? `com.yourorg.app${APP_ID}`,
    },
    android: {
      ...(config.android ?? {}),
      package: config.android?.package ?? `com.yourorg.app${APP_ID}`,
    },
    extra: {
      ...(config.extra ?? {}),
      appId: APP_ID,
    },
  };
};