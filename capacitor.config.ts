import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.antigravity.gpsbgapp',
  appName: 'gps-bg-app',
  webDir: 'www',
  android: {
    useLegacyBridge: true
  }
};

export default config;
