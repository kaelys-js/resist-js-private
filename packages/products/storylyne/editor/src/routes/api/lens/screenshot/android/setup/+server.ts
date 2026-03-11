/**
 * Android SDK Setup Guide API
 *
 * Returns the Android SDK installation status and step-by-step setup
 * instructions. Used by the UI to show a setup guide when the SDK
 * is not installed.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { checkAndroidSdk } from '$lib/server/simulator/android-sdk';

/* ------------------------------------------------------------------ */
/*  GET handler                                                        */
/* ------------------------------------------------------------------ */

/**
 * GET handler — returns Android SDK status and setup instructions.
 *
 * @returns JSON with installation status and instructions (200) or 404 in production
 */
export const GET: RequestHandler = async () => {
  if (!dev) {
    return new Response('Android Setup API is dev-only', { status: 404 });
  }

  const status = await checkAndroidSdk();

  return new Response(
    JSON.stringify({
      installed: status.installed,
      sdkRoot: status.sdkRoot,
      adbVersion: status.adbVersion,
      instructions: status.instructions,
      steps: [
        {
          title: 'Install Android Studio',
          description: 'Download from https://developer.android.com/studio',
          completed: status.installed,
        },
        {
          title: 'Set ANDROID_HOME',
          description: 'Add to your shell profile: export ANDROID_HOME=$HOME/Library/Android/sdk',
          completed: Boolean(status.sdkRoot),
        },
        {
          title: 'Install platform-tools',
          description: 'Run: sdkmanager "platform-tools"',
          completed: status.installed,
        },
        {
          title: 'Create an AVD',
          description: 'Use AVD Manager in Android Studio or run: avdmanager create avd',
          completed: false,
        },
      ],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    },
  );
};
