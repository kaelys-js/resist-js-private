/**
 * iOS Simulator Detection — `xcrun simctl` wrapper
 *
 * Detects Xcode CLI availability and lists available iOS Simulator devices
 * by parsing `xcrun simctl list --json`. Provides typed device metadata
 * including UDID, name, state, OS version, and device type.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Simulator device boot state. */
export type SimulatorState = 'Booted' | 'Shutdown' | 'Shutting Down';

/** Individual iOS Simulator device info. */
export type SimulatorDevice = {
  /** Unique device identifier. */
  udid: Str;
  /** Human-readable device name (e.g., 'iPhone 17 Pro'). */
  name: Str;
  /** Current boot state. */
  state: SimulatorState;
  /** Whether the device is available for use. */
  isAvailable: Bool;
  /** Core Simulator device type identifier. */
  deviceTypeIdentifier: Str;
  /** iOS runtime version string (e.g., 'iOS 26.0'). */
  runtimeVersion: Str;
  /** Screen width in points. */
  screenWidth: Num;
  /** Screen height in points. */
  screenHeight: Num;
  /** Device scale factor (1x, 2x, 3x). */
  scaleFactor: Num;
};

/** Device dimensions lookup from device type identifier. */
type DeviceDimensions = {
  /** Screen width in points. */
  width: Num;
  /** Screen height in points. */
  height: Num;
  /** Device scale factor. */
  scale: Num;
};

/* ------------------------------------------------------------------ */
/*  Device dimensions lookup                                           */
/* ------------------------------------------------------------------ */

/**
 * Static lookup table for iOS device screen dimensions.
 * Maps device type identifier prefixes to point dimensions and scale.
 */
const DEVICE_DIMENSIONS: Map<Str, DeviceDimensions> = new Map([
  /* iPhone 17 series */
  ['iPhone-17-Pro-Max' as Str, { width: 440 as Num, height: 956 as Num, scale: 3 as Num }],
  ['iPhone-17-Pro' as Str, { width: 402 as Num, height: 874 as Num, scale: 3 as Num }],
  ['iPhone-17' as Str, { width: 393 as Num, height: 852 as Num, scale: 3 as Num }],
  ['iPhone-Air' as Str, { width: 430 as Num, height: 932 as Num, scale: 3 as Num }],
  /* iPhone 16 series */
  ['iPhone-16-Pro-Max' as Str, { width: 440 as Num, height: 956 as Num, scale: 3 as Num }],
  ['iPhone-16-Pro' as Str, { width: 402 as Num, height: 874 as Num, scale: 3 as Num }],
  ['iPhone-16-Plus' as Str, { width: 430 as Num, height: 932 as Num, scale: 3 as Num }],
  ['iPhone-16' as Str, { width: 393 as Num, height: 852 as Num, scale: 3 as Num }],
  ['iPhone-16e' as Str, { width: 375 as Num, height: 667 as Num, scale: 2 as Num }],
  /* iPhone 15 series */
  ['iPhone-15-Pro-Max' as Str, { width: 430 as Num, height: 932 as Num, scale: 3 as Num }],
  ['iPhone-15-Pro' as Str, { width: 393 as Num, height: 852 as Num, scale: 3 as Num }],
  ['iPhone-15-Plus' as Str, { width: 430 as Num, height: 932 as Num, scale: 3 as Num }],
  ['iPhone-15' as Str, { width: 393 as Num, height: 852 as Num, scale: 3 as Num }],
  /* iPhone 14 series */
  ['iPhone-14-Pro-Max' as Str, { width: 430 as Num, height: 932 as Num, scale: 3 as Num }],
  ['iPhone-14-Pro' as Str, { width: 393 as Num, height: 852 as Num, scale: 3 as Num }],
  ['iPhone-14-Plus' as Str, { width: 428 as Num, height: 926 as Num, scale: 3 as Num }],
  ['iPhone-14' as Str, { width: 390 as Num, height: 844 as Num, scale: 3 as Num }],
  /* iPhone SE / older */
  ['iPhone-SE-3rd-generation' as Str, { width: 375 as Num, height: 667 as Num, scale: 2 as Num }],
  ['iPhone-SE--2nd-generation-' as Str, { width: 375 as Num, height: 667 as Num, scale: 2 as Num }],
  /* iPhone 13 series */
  ['iPhone-13-Pro-Max' as Str, { width: 428 as Num, height: 926 as Num, scale: 3 as Num }],
  ['iPhone-13-Pro' as Str, { width: 390 as Num, height: 844 as Num, scale: 3 as Num }],
  ['iPhone-13' as Str, { width: 390 as Num, height: 844 as Num, scale: 3 as Num }],
  ['iPhone-13-mini' as Str, { width: 375 as Num, height: 812 as Num, scale: 3 as Num }],
  /* iPhone 12 series */
  ['iPhone-12-Pro-Max' as Str, { width: 428 as Num, height: 926 as Num, scale: 3 as Num }],
  ['iPhone-12-Pro' as Str, { width: 390 as Num, height: 844 as Num, scale: 3 as Num }],
  ['iPhone-12' as Str, { width: 390 as Num, height: 844 as Num, scale: 3 as Num }],
  ['iPhone-12-mini' as Str, { width: 375 as Num, height: 812 as Num, scale: 3 as Num }],
  /* iPhone 11 series */
  ['iPhone-11-Pro-Max' as Str, { width: 414 as Num, height: 896 as Num, scale: 3 as Num }],
  ['iPhone-11-Pro' as Str, { width: 375 as Num, height: 812 as Num, scale: 3 as Num }],
  ['iPhone-11' as Str, { width: 414 as Num, height: 896 as Num, scale: 2 as Num }],
  /* iPad Pro */
  ['iPad-Pro-13-inch' as Str, { width: 1032 as Num, height: 1376 as Num, scale: 2 as Num }],
  ['iPad-Pro-11-inch' as Str, { width: 834 as Num, height: 1194 as Num, scale: 2 as Num }],
  /* iPad Air */
  ['iPad-Air' as Str, { width: 820 as Num, height: 1180 as Num, scale: 2 as Num }],
  /* iPad mini */
  ['iPad-mini' as Str, { width: 744 as Num, height: 1133 as Num, scale: 2 as Num }],
  /* iPad */
  ['iPad--10th-generation-' as Str, { width: 820 as Num, height: 1180 as Num, scale: 2 as Num }],
]);

/**
 * Look up device dimensions from a device type identifier.
 *
 * Matches by extracting the device model suffix from the full identifier
 * (e.g., 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro' → 'iPhone-17-Pro').
 *
 * @param deviceTypeIdentifier - Full Core Simulator device type identifier
 * @returns Dimensions or default fallback
 */
function lookupDimensions(deviceTypeIdentifier: Str): DeviceDimensions {
  const suffix: Str = deviceTypeIdentifier.split('.').pop() as Str;

  /* Try exact match first */
  const exact: DeviceDimensions | undefined = DEVICE_DIMENSIONS.get(suffix);
  if (exact) return exact;

  /* Try prefix match (handles variants like iPad-Pro-13-inch-M5-12GB) */
  for (const [key, dims] of DEVICE_DIMENSIONS) {
    if (suffix.startsWith(key)) return dims;
  }

  /* Default fallback — iPhone-sized */
  return { width: 390 as Num, height: 844 as Num, scale: 3 as Num };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Check if `xcrun simctl` is available on this system.
 *
 * @returns `true` if Xcode CLI tools are installed and simctl is available
 */
export async function isXcrunAvailable(): Promise<Bool> {
  try {
    await execFileAsync('xcrun', ['simctl', 'help']);
    return true as Bool;
  } catch {
    /* xcrun not found or Xcode not installed */
    return false as Bool;
  }
}

/**
 * Extract a human-readable iOS version from a runtime identifier.
 *
 * @param runtimeId - Runtime identifier (e.g., 'com.apple.CoreSimulator.SimRuntime.iOS-26-0')
 * @returns Human-readable version (e.g., 'iOS 26.0')
 *
 * @example
 * parseRuntimeVersion('com.apple.CoreSimulator.SimRuntime.iOS-26-0') // 'iOS 26.0'
 * parseRuntimeVersion('com.apple.CoreSimulator.SimRuntime.iOS-18-6') // 'iOS 18.6'
 */
export function parseRuntimeVersion(runtimeId: Str): Str {
  /* Extract the suffix after 'SimRuntime.' */
  const parts: Str[] = runtimeId.split('SimRuntime.') as Str[];
  const suffix: Str = (parts[1] ?? runtimeId) as Str;

  /* Replace hyphens with dots for version, keep OS name */
  /* 'iOS-26-0' → 'iOS 26.0' */
  const osMatch: RegExpMatchArray | null = suffix.match(/^(\w+)-(.+)$/);
  if (osMatch) {
    const os: Str = osMatch[1] as Str;
    const version: Str = (osMatch[2] ?? '').replaceAll('-', '.') as Str;
    return `${os} ${version}` as Str;
  }

  return suffix;
}

/**
 * List all available iOS Simulator devices.
 *
 * Parses the JSON output of `xcrun simctl list devices available --json`
 * and returns typed device metadata including dimensions looked up from
 * a static device type → screen size table.
 *
 * @returns Array of available simulator devices sorted by name
 */
export async function listSimulatorDevices(): Promise<SimulatorDevice[]> {
  const { stdout } = await execFileAsync('xcrun', [
    'simctl',
    'list',
    'devices',
    'available',
    '--json',
  ]);

  const parsed: Record<Str, unknown> = JSON.parse(stdout) as Record<Str, unknown>;
  const devicesMap: Record<Str, unknown[]> = (parsed.devices ?? {}) as Record<Str, unknown[]>;

  const result: SimulatorDevice[] = [];

  for (const [runtimeId, devices] of Object.entries(devicesMap)) {
    /* Only include iOS runtimes */
    if (!runtimeId.includes('iOS')) continue;

    const runtimeVersion: Str = parseRuntimeVersion(runtimeId as Str);

    for (const raw of devices) {
      const d: Record<Str, unknown> = raw as Record<Str, unknown>;
      if (d.isAvailable !== true) continue;

      const deviceTypeId: Str = (d.deviceTypeIdentifier ?? '') as Str;
      const dims: DeviceDimensions = lookupDimensions(deviceTypeId);

      result.push({
        udid: (d.udid ?? '') as Str,
        name: (d.name ?? '') as Str,
        state: (d.state ?? 'Shutdown') as SimulatorState,
        isAvailable: true as Bool,
        deviceTypeIdentifier: deviceTypeId,
        runtimeVersion,
        screenWidth: dims.width,
        screenHeight: dims.height,
        scaleFactor: dims.scale,
      });
    }
  }

  /* Sort alphabetically by name */
  result.sort((a: SimulatorDevice, b: SimulatorDevice): Num => {
    return a.name.localeCompare(b.name) as Num;
  });

  return result;
}
