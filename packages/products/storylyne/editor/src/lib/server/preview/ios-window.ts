/**
 * iOS Simulator window tracking.
 *
 * Queries Simulator.app window position and size via AppleScript,
 * looks up device scale factors from known device profiles, and
 * maps viewport coordinates to macOS screen coordinates.
 *
 * @module
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Num, Str } from '@/schemas/common';

const execFileAsync = promisify(execFile);

// =============================================================================
// Types
// =============================================================================

/** Window bounds in macOS screen coordinates. */
export type WindowBounds = {
  /** X position of window origin. */
  x: Num;
  /** Y position of window origin. */
  y: Num;
  /** Window content width in screen pixels. */
  width: Num;
  /** Window content height in screen pixels. */
  height: Num;
};

// =============================================================================
// Scale factors
// =============================================================================

/**
 * Known device scale factors (device pixels per point).
 *
 * Maps iOS Simulator device names to their native scale factor.
 * Used for coordinate translation between viewport and device pixels.
 */
export const KNOWN_SCALE_FACTORS: Record<Str, Num> = {
  /* iPhone — 3x Retina */
  'iPhone 17 Pro': 3 as Num,
  'iPhone 17 Pro Max': 3 as Num,
  'iPhone 16 Pro': 3 as Num,
  'iPhone 16 Pro Max': 3 as Num,
  'iPhone 16': 3 as Num,
  'iPhone 16 Plus': 3 as Num,
  'iPhone 15 Pro': 3 as Num,
  'iPhone 15 Pro Max': 3 as Num,
  'iPhone 15': 3 as Num,
  'iPhone 15 Plus': 3 as Num,
  'iPhone 14 Pro': 3 as Num,
  'iPhone 14 Pro Max': 3 as Num,
  'iPhone 14': 3 as Num,
  'iPhone 14 Plus': 3 as Num,
  /* iPhone — 2x Retina */
  'iPhone SE (3rd generation)': 2 as Num,
  'iPhone SE (2nd generation)': 2 as Num,
  /* iPad — 2x Retina */
  'iPad Pro 13-inch (M4)': 2 as Num,
  'iPad Pro 11-inch (M4)': 2 as Num,
  'iPad Air 13-inch (M3)': 2 as Num,
  'iPad Air 11-inch (M3)': 2 as Num,
  'iPad (10th generation)': 2 as Num,
  'iPad mini (7th generation)': 2 as Num,
} as Record<Str, Num>;

/** Default scale factor for unknown devices. */
const DEFAULT_SCALE_FACTOR: Num = 2 as Num;

// =============================================================================
// Window bounds
// =============================================================================

/**
 * Get the Simulator.app front window bounds.
 *
 * Uses AppleScript to query the position and size of the
 * frontmost Simulator window.
 *
 * @returns {Promise<WindowBounds>} Window bounds in macOS screen coordinates
 * @throws If Simulator.app is not running or AppleScript fails
 *
 * @example
 * const bounds = await getSimulatorWindowBounds();
 * // { x: 100, y: 200, width: 490, height: 1066 }
 */
export async function getSimulatorWindowBounds(): Promise<WindowBounds> {
  const script: string = [
    'tell application "System Events"',
    '  tell process "Simulator"',
    '    set frontWin to front window',
    '    set winPos to position of frontWin',
    '    set winSize to size of frontWin',
    '    set x1 to item 1 of winPos',
    '    set y1 to item 2 of winPos',
    '    set x2 to x1 + item 1 of winSize',
    '    set y2 to y1 + item 2 of winSize',
    '    return (x1 as text) & ", " & (y1 as text) & ", " & (x2 as text) & ", " & (y2 as text)',
    '  end tell',
    'end tell',
  ].join('\n');

  const { stdout } = await execFileAsync('osascript', ['-e', script]);
  const parts: string[] = stdout
    .trim()
    .split(',')
    .map((s: string) => s.trim());

  const x1: Num = Number.parseInt(parts[0] ?? '0', 10) as Num;
  const y1: Num = Number.parseInt(parts[1] ?? '0', 10) as Num;
  const x2: Num = Number.parseInt(parts[2] ?? '0', 10) as Num;
  const y2: Num = Number.parseInt(parts[3] ?? '0', 10) as Num;

  return {
    x: x1,
    y: y1,
    width: ((x2 as number) - (x1 as number)) as Num,
    height: ((y2 as number) - (y1 as number)) as Num,
  };
}

// =============================================================================
// Scale factor
// =============================================================================

/**
 * Get the device scale factor for a simulator by UDID.
 *
 * Queries the device name via `xcrun simctl list` and looks up
 * the scale factor from the known device table.
 *
 * @param {Str} udid - Device UDID
 * @returns {Promise<Num>} Scale factor (2 or 3 for current iOS devices)
 *
 * @example
 * const scale = await getDeviceScaleFactor('B33CE7D0-...');
 * // 3 for iPhone 17 Pro
 */
export async function getDeviceScaleFactor(udid: Str): Promise<Num> {
  const { stdout } = await execFileAsync('xcrun', ['simctl', 'list', 'devices', '--json']);
  const parsed: Record<string, unknown> = JSON.parse(stdout) as Record<string, unknown>;
  const devicesMap: Record<string, unknown[]> = (parsed.devices ?? {}) as Record<string, unknown[]>;

  for (const devices of Object.values(devicesMap)) {
    for (const raw of devices) {
      const d: Record<string, unknown> = raw as Record<string, unknown>;

      if (d.udid === (udid as string)) {
        const name: Str = (d.name ?? '') as Str;
        const factor: Num | undefined = KNOWN_SCALE_FACTORS[name];

        return factor ?? DEFAULT_SCALE_FACTOR;
      }
    }
  }

  return DEFAULT_SCALE_FACTOR;
}

// =============================================================================
// Coordinate mapping
// =============================================================================

/**
 * Map viewport coordinates to macOS screen coordinates.
 *
 * Translates a point within the viewport (0,0 = top-left of
 * the simulated screen) to absolute macOS screen coordinates
 * based on the Simulator window position.
 *
 * Clamps coordinates within the window bounds.
 *
 * @param {Num} viewX - X coordinate in viewport pixels
 * @param {Num} viewY - Y coordinate in viewport pixels
 * @param {WindowBounds} bounds - Current Simulator window bounds
 * @returns {{ screenX: Num; screenY: Num }} Absolute macOS screen coordinates with screenX and screenY
 */
export function mapViewportToScreen(
  viewX: Num,
  viewY: Num,
  bounds: WindowBounds,
): { screenX: Num; screenY: Num } {
  /* Clamp viewport coordinates within window dimensions */
  const clampedX: Num = Math.max(0, Math.min(viewX as number, bounds.width as number)) as Num;
  const clampedY: Num = Math.max(0, Math.min(viewY as number, bounds.height as number)) as Num;

  return {
    screenX: ((bounds.x as number) + (clampedX as number)) as Num,
    screenY: ((bounds.y as number) + (clampedY as number)) as Num,
  };
}
