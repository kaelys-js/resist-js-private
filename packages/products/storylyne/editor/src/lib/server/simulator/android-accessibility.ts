/**
 * Android Emulator Accessibility Settings
 *
 * Manages accessibility and display settings on the Android emulator
 * via `adb shell` commands: dark mode (UI mode), font scale, display
 * density, and animation scale.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Android emulator accessibility / display settings. */
export type AndroidAccessibilitySettings = {
  /** Dark mode: 'yes' or 'no'. Uses `cmd uimode night yes|no`. */
  nightMode?: Str;
  /** Font scale multiplier (e.g. '1.0', '1.5', '2.0'). Uses `settings put system font_scale`. */
  fontScale?: Str;
  /** Display density in DPI (e.g. '420', '480'). Uses `wm density`. */
  displayDensity?: Str;
  /** Animation scale ('0' to disable, '1' for default). Uses `settings put global`. */
  animationScale?: Str;
};

/** A command descriptor for applying a single accessibility setting. */
export type AccessibilityCommand = {
  /** ADB command arguments (after `-s <serial>`). */
  args: Str[];
  /** Human-readable description. */
  description: Str;
};

/* ------------------------------------------------------------------ */
/*  Command building                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build `adb shell` commands for applying accessibility settings.
 *
 * @param _adbPath - Path to `adb` binary (unused in command building, kept for API symmetry)
 * @param serial - Emulator serial (e.g. 'emulator-5554')
 * @param settings - Accessibility settings to apply
 * @returns Array of command descriptors
 *
 * @example
 * const cmds = buildAccessibilityCommands('/path/to/adb', 'emulator-5554', { nightMode: 'yes' });
 */
export function buildAccessibilityCommands(
  _adbPath: Str,
  serial: Str,
  settings: AndroidAccessibilitySettings,
): AccessibilityCommand[] {
  const commands: AccessibilityCommand[] = [];

  if (settings.nightMode) {
    commands.push({
      args: ['-s', serial, 'shell', 'cmd', 'uimode', 'night', settings.nightMode] as Str[],
      description: `Set dark mode to ${settings.nightMode}` as Str,
    });
  }

  if (settings.fontScale) {
    commands.push({
      args: [
        '-s',
        serial,
        'shell',
        'settings',
        'put',
        'system',
        'font_scale',
        settings.fontScale,
      ] as Str[],
      description: `Set font scale to ${settings.fontScale}` as Str,
    });
  }

  if (settings.displayDensity) {
    commands.push({
      args: ['-s', serial, 'shell', 'wm', 'density', settings.displayDensity] as Str[],
      description: `Set display density to ${settings.displayDensity}` as Str,
    });
  }

  if (settings.animationScale) {
    commands.push({
      args: [
        '-s',
        serial,
        'shell',
        'settings',
        'put',
        'global',
        'window_animation_scale',
        settings.animationScale,
      ] as Str[],
      description: `Set animation scale to ${settings.animationScale}` as Str,
    });
  }

  return commands;
}

/* ------------------------------------------------------------------ */
/*  Execution                                                          */
/* ------------------------------------------------------------------ */

/**
 * Apply accessibility settings to an Android emulator.
 *
 * Runs all commands via `Promise.allSettled` — individual failures
 * do not prevent other settings from being applied.
 *
 * @param adbPath - Path to `adb` binary
 * @param serial - Emulator serial
 * @param settings - Settings to apply
 *
 * @example
 * await applyAccessibilitySettings('/path/to/adb', 'emulator-5554', { nightMode: 'yes' });
 */
export async function applyAccessibilitySettings(
  adbPath: Str,
  serial: Str,
  settings: AndroidAccessibilitySettings,
): Promise<void> {
  const commands: AccessibilityCommand[] = buildAccessibilityCommands(adbPath, serial, settings);
  if (commands.length === 0) {
    return;
  }

  const executions: Array<Promise<unknown>> = commands.map((cmd: AccessibilityCommand) =>
    execFileAsync(adbPath as string, cmd.args as string[]),
  );

  await Promise.allSettled(executions);
}

/**
 * Parse accessibility settings from URL search params.
 *
 * @param params - URL search parameters
 * @returns Parsed settings object
 *
 * @example
 * const settings = parseAccessibilityParams(url.searchParams);
 */
export function parseAccessibilityParams(params: URLSearchParams): AndroidAccessibilitySettings {
  const settings: AndroidAccessibilitySettings = {};

  const nightMode: string | null = params.get('nightMode');
  if (nightMode === 'yes' || nightMode === 'no') {
    settings.nightMode = nightMode as Str;
  }

  const fontScale: string | null = params.get('fontScale');
  if (fontScale) {
    settings.fontScale = fontScale as Str;
  }

  const displayDensity: string | null = params.get('displayDensity');
  if (displayDensity) {
    settings.displayDensity = displayDensity as Str;
  }

  const animationScale: string | null = params.get('animationScale');
  if (animationScale) {
    settings.animationScale = animationScale as Str;
  }

  return settings;
}
