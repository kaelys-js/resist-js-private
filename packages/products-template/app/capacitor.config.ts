import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.{product}',
  appName: '{product}',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
};

export default config;
