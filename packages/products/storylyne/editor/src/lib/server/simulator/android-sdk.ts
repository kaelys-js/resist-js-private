/**
 * Android SDK Detection & Path Resolution
 *
 * Detects the Android SDK installation, resolves paths to `adb`, `emulator`,
 * and `avdmanager` binaries, and provides version information. This is an
 * OPTIONAL dependency — if the SDK is not installed, the Android Emulator
 * screenshot engine is disabled and the UI shows a setup guide link.
 *
 * @module
 */

import type { Bool, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// =============================================================================
// Types
// =============================================================================

/** Resolved paths to Android SDK binaries. */
export type AndroidSdkPaths = {
  /** Path to `adb` binary. */
  adb: Str;
  /** Path to `emulator` binary. */
  emulator: Str;
  /** Path to `avdmanager` binary. */
  avdmanager: Str;
};

/** Android SDK installation status. */
export type AndroidSdkStatus = {
  /** Whether the SDK is installed and usable. */
  installed: Bool;
  /** ANDROID_HOME / ANDROID_SDK_ROOT path (if set). */
  sdkRoot: Str;
  /** Resolved SDK binary paths. */
  paths: AndroidSdkPaths;
  /** `adb` version string (e.g. '35.0.2'). */
  adbVersion: Str;
  /** Human-readable install instructions when SDK is missing. */
  instructions: Str;
};

// =============================================================================
// Path resolution
// =============================================================================

/**
 * Build SDK binary paths from an ANDROID_HOME root.
 *
 * @param {Str} sdkRoot - Path to the Android SDK root directory
 * @returns {AndroidSdkPaths} Object with resolved `adb`, `emulator`, and `avdmanager` paths
 *
 * @example
 * const paths = buildSdkPaths('/Users/me/Library/Android/sdk');
 * // paths.adb === '/Users/me/Library/Android/sdk/platform-tools/adb'
 */
export function buildSdkPaths(sdkRoot: Str): AndroidSdkPaths {
  const root: Str = (sdkRoot as string).replace(/\/+$/, '') as Str;

  return {
    adb: `${root}/platform-tools/adb` as Str,
    emulator: `${root}/emulator/emulator` as Str,
    avdmanager: `${root}/cmdline-tools/latest/bin/avdmanager` as Str,
  };
}

// =============================================================================
// Version parsing
// =============================================================================

/**
 * Parse the version string from `adb version` output.
 *
 * Looks for the `Version X.Y.Z` line in the multi-line output.
 *
 * @param {Str} output - Raw stdout from `adb version`
 * @returns {Str | null} Version string (e.g. '35.0.2'), or null if not found
 *
 * @example
 * const ver = parseAdbVersion('Android Debug Bridge version 1.0.41\nVersion 35.0.2-12147458');
 * // ver === '35.0.2'
 */
export function parseAdbVersion(output: Str): Str | null {
  const match: RegExpMatchArray | null = (output as string).match(/Version\s+(\d+\.\d+\.\d+)/);

  if (!match?.[1]) {
    return null;
  }
  return match[1] as Str;
}

// =============================================================================
// SDK detection
// =============================================================================

/**
 * Detect the Android SDK root directory.
 *
 * Checks `ANDROID_HOME`, `ANDROID_SDK_ROOT`, then probes common install
 * locations (Homebrew, Android Studio default) and returns the first that
 * actually exists on disk.
 *
 * @returns SDK root path, or empty string if not found
 */
function detectSdkRoot(): Str {
  /* Explicit env vars take priority — trust the user */
  const envHome: Str = (process.env.ANDROID_HOME ?? '') as Str;

  if (envHome) {
    return envHome;
  }

  const envRoot: Str = (process.env.ANDROID_SDK_ROOT ?? '') as Str;

  if (envRoot) {
    return envRoot;
  }

  /* Probe common default locations — return first that exists */
  const home: Str = (process.env.HOME ?? '') as Str;
  const candidates: Str[] = [
    '/opt/homebrew/share/android-commandlinetools' as Str,
    `${home}/Library/Android/sdk` as Str,
    '/usr/local/share/android-commandlinetools' as Str,
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate as string)) {
      return candidate;
    }
  }

  return '' as Str;
}

/**
 * Check if the Android SDK is installed and return full status.
 *
 * Resolves SDK paths, checks if `adb` is runnable, and retrieves
 * the version string. Returns a complete status object with install
 * instructions when the SDK is not found.
 *
 * @returns {Promise<AndroidSdkStatus>} SDK installation status
 *
 * @example
 * const status = await checkAndroidSdk();
 * if (!status.installed) console.log(status.instructions);
 */
export async function checkAndroidSdk(): Promise<AndroidSdkStatus> {
  const sdkRoot: Str = detectSdkRoot();
  const paths: AndroidSdkPaths = buildSdkPaths(sdkRoot);

  if (!sdkRoot) {
    return {
      installed: false as Bool,
      sdkRoot: '' as Str,
      paths,
      adbVersion: '' as Str,
      instructions:
        'Android SDK not found. Set ANDROID_HOME environment variable or install Android Studio.' as Str,
    };
  }

  try {
    const { stdout } = await execFileAsync(paths.adb as string, ['version']);
    const version: Str | null = parseAdbVersion(stdout as Str);

    return {
      installed: true as Bool,
      sdkRoot,
      paths,
      adbVersion: (version ?? 'unknown') as Str,
      instructions: '' as Str,
    };
  } catch {
    /* adb not runnable */
    return {
      installed: false as Bool,
      sdkRoot,
      paths,
      adbVersion: '' as Str,
      instructions:
        'Android SDK found but adb is not runnable. Ensure platform-tools are installed.' as Str,
    };
  }
}

/**
 * Check if `adb` is available on the system PATH.
 *
 * @returns {Promise<Bool>} `true` if adb is found
 *
 * @example
 * const available = await isAdbAvailable();
 * if (!available) console.log('Install Android SDK');
 */
export async function isAdbAvailable(): Promise<Bool> {
  try {
    await execFileAsync('which', ['adb']);
    return true as Bool;
  } catch {
    /* Not found on PATH */
    return false as Bool;
  }
}
