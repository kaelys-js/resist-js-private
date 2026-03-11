/**
 * iOS Simulator Accessibility Settings
 *
 * Configures accessibility preferences on iOS Simulator devices
 * via `xcrun simctl` commands. Supports dark mode/light mode,
 * content size categories, increase contrast, reduce motion,
 * and reduce transparency.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** iOS content size category names mapped to UIKit constants. */
const CONTENT_SIZE_MAP: Record<Str, Str> = {
  'extra-small': 'UICTContentSizeCategoryXS' as Str,
  small: 'UICTContentSizeCategoryS' as Str,
  medium: 'UICTContentSizeCategoryM' as Str,
  large: 'UICTContentSizeCategoryL' as Str,
  'extra-large': 'UICTContentSizeCategoryXL' as Str,
  'extra-extra-large': 'UICTContentSizeCategoryXXL' as Str,
  'extra-extra-extra-large': 'UICTContentSizeCategoryXXXL' as Str,
  'accessibility-medium': 'UICTContentSizeCategoryAccessibilityM' as Str,
  'accessibility-large': 'UICTContentSizeCategoryAccessibilityL' as Str,
  'accessibility-extra-large': 'UICTContentSizeCategoryAccessibilityXL' as Str,
  'accessibility-extra-extra-large': 'UICTContentSizeCategoryAccessibilityXXL' as Str,
  'accessibility-extra-extra-extra-large': 'UICTContentSizeCategoryAccessibilityXXXL' as Str,
} as Record<Str, Str>;

/** Accessibility settings that can be applied to a simulator. */
export type IosAccessibilitySettings = {
  /** Appearance mode: 'light' or 'dark'. */
  appearance?: Str;
  /** Dynamic Type content size category. */
  contentSize?: Str;
  /** Enable or disable Increase Contrast. */
  increaseContrast?: boolean;
  /** Enable or disable Reduce Motion. */
  reduceMotion?: boolean;
  /** Enable or disable Reduce Transparency. */
  reduceTransparency?: boolean;
};

/** A simctl command descriptor (args array + description for logging). */
export type SimctlCommand = {
  /** Arguments to pass to `xcrun` (e.g., `['simctl', 'ui', udid, 'appearance', 'dark']`). */
  args: Str[];
  /** Human-readable description of what this command does. */
  description: Str;
};

/* ------------------------------------------------------------------ */
/*  Command builders                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build the list of `xcrun` commands needed to apply accessibility settings.
 *
 * Does NOT execute the commands — returns descriptors for caller to execute.
 * This separation allows testing without side effects.
 *
 * @param udid - Device UDID to configure
 * @param settings - Accessibility settings to apply
 * @returns Array of command descriptors (may be empty if no settings specified)
 *
 * @example
 * const cmds = buildAccessibilityCommands(udid, { appearance: 'dark' });
 * // [{ args: ['simctl', 'ui', udid, 'appearance', 'dark'], description: '...' }]
 */
export function buildAccessibilityCommands(
  udid: Str,
  settings: IosAccessibilitySettings,
): SimctlCommand[] {
  const commands: SimctlCommand[] = [];

  /* Dark/Light mode — simctl ui <udid> appearance <value> */
  if (settings.appearance) {
    commands.push({
      args: ['simctl', 'ui', udid, 'appearance', settings.appearance] as Str[],
      description: `Set appearance to ${settings.appearance}` as Str,
    });
  }

  /* Content size category — notifyutil to set the preferred content size */
  if (settings.contentSize) {
    const uikitConstant: Str = (CONTENT_SIZE_MAP[settings.contentSize] ??
      ('UICTContentSizeCategoryL' as Str)) as Str;
    commands.push({
      args: [
        'simctl',
        'spawn',
        udid,
        'notifyutil',
        '-s',
        'com.apple.UIKit.preferredContentSizeCategory',
        uikitConstant,
      ] as Str[],
      description: `Set content size to ${settings.contentSize}` as Str,
    });
  }

  /* Increase Contrast — defaults write */
  if (settings.increaseContrast) {
    commands.push(buildDefaultsWriteCommand(udid, 'increaseContrast'));
  }

  /* Reduce Motion — defaults write */
  if (settings.reduceMotion) {
    commands.push(buildDefaultsWriteCommand(udid, 'reduceMotion'));
  }

  /* Reduce Transparency — defaults write */
  if (settings.reduceTransparency) {
    commands.push(buildDefaultsWriteCommand(udid, 'reduceTransparency'));
  }

  return commands;
}

/**
 * Apply accessibility settings to a booted iOS Simulator device.
 *
 * Executes each command in sequence. Failures are logged but do not
 * throw — accessibility settings are best-effort (screenshot still works
 * even if a setting fails to apply).
 *
 * @param udid - Device UDID (must be booted)
 * @param settings - Accessibility settings to apply
 * @returns Number of commands that executed successfully
 *
 * @example
 * const applied = await applyAccessibilitySettings(udid, { appearance: 'dark' });
 */
export async function applyAccessibilitySettings(
  udid: Str,
  settings: IosAccessibilitySettings,
): Promise<Num> {
  const commands: SimctlCommand[] = buildAccessibilityCommands(udid, settings);
  if (commands.length === 0) return 0 as Num;

  let successCount: Num = 0 as Num;

  /* Execute sequentially — some commands depend on prior state */
  const results: Array<PromiseSettledResult<void>> = await Promise.allSettled(
    commands.map(async (cmd: SimctlCommand): Promise<void> => {
      await execFileAsync('xcrun', cmd.args as string[]);
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successCount = (successCount + 1) as Num;
    }
    /* Rejected results are silently skipped — accessibility is best-effort */
  }

  return successCount;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Accessibility preference keys mapped to their Apple plist domain and key. */
const ACCESSIBILITY_PREFS: Record<Str, { domain: Str; key: Str; value: Str }> = {
  increaseContrast: {
    domain: 'com.apple.Accessibility' as Str,
    key: 'DarkenSystemColors' as Str,
    value: '1' as Str,
  },
  reduceMotion: {
    domain: 'com.apple.Accessibility' as Str,
    key: 'ReduceMotionEnabled' as Str,
    value: '1' as Str,
  },
  reduceTransparency: {
    domain: 'com.apple.Accessibility' as Str,
    key: 'EnhancedBackgroundContrastEnabled' as Str,
    value: '1' as Str,
  },
} as Record<Str, { domain: Str; key: Str; value: Str }>;

/**
 * Build a `defaults write` command for an accessibility preference.
 *
 * Uses `xcrun simctl spawn` to run `defaults write` inside the simulator.
 *
 * @param udid - Device UDID
 * @param prefKey - Preference key ('increaseContrast' | 'reduceMotion' | 'reduceTransparency')
 * @returns Command descriptor
 */
function buildDefaultsWriteCommand(udid: Str, prefKey: Str): SimctlCommand {
  const pref: { domain: Str; key: Str; value: Str } = ACCESSIBILITY_PREFS[prefKey] ?? {
    domain: 'com.apple.Accessibility' as Str,
    key: prefKey,
    value: '1' as Str,
  };

  const enableLabel: Str = prefKey
    .replaceAll(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase() as Str;

  return {
    args: [
      'simctl',
      'spawn',
      udid,
      'defaults',
      'write',
      pref.domain,
      pref.key,
      '-bool',
      'YES',
    ] as Str[],
    description: `Enable ${enableLabel}` as Str,
  };
}

/**
 * Parse accessibility settings from URL query parameters.
 *
 * @param searchParams - URL search params
 * @returns Parsed accessibility settings (only fields that were present)
 *
 * @example
 * const settings = parseAccessibilityParams(url.searchParams);
 * // { appearance: 'dark', reduceMotion: true }
 */
export function parseAccessibilityParams(searchParams: URLSearchParams): IosAccessibilitySettings {
  const settings: IosAccessibilitySettings = {};

  const appearance: Str = (searchParams.get('appearance') ?? '') as Str;
  if (appearance === 'dark' || appearance === 'light') {
    settings.appearance = appearance as Str;
  }

  const contentSize: Str = (searchParams.get('contentSize') ?? '') as Str;
  if (contentSize && contentSize in (CONTENT_SIZE_MAP as Record<string, string>)) {
    settings.contentSize = contentSize as Str;
  }

  if (searchParams.get('increaseContrast') === 'true') {
    settings.increaseContrast = true;
  }

  if (searchParams.get('reduceMotion') === 'true') {
    settings.reduceMotion = true;
  }

  if (searchParams.get('reduceTransparency') === 'true') {
    settings.reduceTransparency = true;
  }

  return settings;
}
