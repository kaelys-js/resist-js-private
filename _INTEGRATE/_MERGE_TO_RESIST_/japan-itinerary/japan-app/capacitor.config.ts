import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coleb.japan2026',
  appName: 'Japan 2026',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#1d3a5e',
      showSpinner: false,
      launchShowDuration: 0,
    },
    StatusBar: {
      style: 'DARK',
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#1d3a5e',
    },
  },
};

export default config;
