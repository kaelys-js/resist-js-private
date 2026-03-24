/**
 * Capacitor configuration for native mobile builds.
 *
 * @module
 */

import type { CapacitorConfig } from '@capacitor/cli';

/** Capacitor configuration for native mobile builds. */
const config: CapacitorConfig = {
  appId: 'app.{product}',
  appName: '{product}',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
};

export default config;
