/**
 * Android Emulator Device Profiles
 *
 * Lists available Android Virtual Devices (AVDs), parses their config.ini
 * files for dimensions/density/API level, and provides device profile
 * information for the screenshot API response.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** An Android Virtual Device profile. */
export type AndroidDevice = {
  /** AVD name (e.g. 'Pixel_9_API_35'). */
  name: Str;
  /** Screen width in pixels. */
  width: Num;
  /** Screen height in pixels. */
  height: Num;
  /** Screen density (DPI). */
  density: Num;
  /** Android API level (e.g. 35). */
  apiLevel: Num;
  /** Human-readable display tag (e.g. 'Google Play'). */
  displayTag: Str;
};

/* ------------------------------------------------------------------ */
/*  AVD listing                                                        */
/* ------------------------------------------------------------------ */

/**
 * Parse the output of `emulator -list-avds` into AVD name strings.
 *
 * Each non-empty line of the output is an AVD name.
 *
 * @param output - Raw stdout from `emulator -list-avds`
 * @returns Array of AVD names
 *
 * @example
 * const avds = parseAvdList('Pixel_9_API_35\nMedium_Phone_API_35\n');
 * // ['Pixel_9_API_35', 'Medium_Phone_API_35']
 */
export function parseAvdList(output: Str): Str[] {
  return (output as string)
    .split('\n')
    .map((line: string): Str => line.trim() as Str)
    .filter((line: Str): boolean => (line as string).length > 0);
}

/**
 * Parse an AVD config.ini file into a key-value map.
 *
 * @param content - Raw text content of config.ini
 * @returns Map of configuration keys to values
 *
 * @example
 * const config = parseConfigIni('hw.lcd.width=1080\nhw.lcd.height=2400');
 * // { 'hw.lcd.width': '1080', 'hw.lcd.height': '2400' }
 */
export function parseConfigIni(content: Str): Record<Str, Str> {
  const result: Record<Str, Str> = {};

  for (const line of (content as string).split('\n')) {
    const trimmed: Str = line.trim() as Str;
    if (!(trimmed as string) || (trimmed as string).startsWith('#')) continue;

    const eqIndex: Num = (trimmed as string).indexOf('=') as Num;
    if ((eqIndex as number) < 0) continue;

    const key: Str = (trimmed as string).slice(0, eqIndex as number).trim() as Str;
    const value: Str = (trimmed as string).slice((eqIndex as number) + 1).trim() as Str;
    result[key] = value;
  }

  return result;
}

/**
 * Extract the Android API level from the system image path in config.ini.
 *
 * Looks for patterns like `android-35` in the `image.sysdir.1` value.
 *
 * @param config - Parsed config.ini key-value map
 * @returns API level number, or 0 if not found
 */
function extractApiLevel(config: Record<Str, Str>): Num {
  const sysdir: Str = config['image.sysdir.1'] ?? ('' as Str);
  const match: RegExpMatchArray | null = (sysdir as string).match(/android-(\d+)/);
  if (!match?.[1]) return 0 as Num;
  return Number.parseInt(match[1], 10) as Num;
}

/**
 * Build an AndroidDevice profile from parsed config.ini data.
 *
 * @param name - AVD name
 * @param config - Parsed config.ini key-value map
 * @returns AndroidDevice profile
 */
function buildDeviceFromConfig(name: Str, config: Record<Str, Str>): AndroidDevice {
  return {
    name,
    width: Number.parseInt((config['hw.lcd.width'] ?? '0') as string, 10) as Num,
    height: Number.parseInt((config['hw.lcd.height'] ?? '0') as string, 10) as Num,
    density: Number.parseInt((config['hw.lcd.density'] ?? '0') as string, 10) as Num,
    apiLevel: extractApiLevel(config),
    displayTag: (config['tag.display'] ?? '') as Str,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * List all available AVDs using the `emulator` binary.
 *
 * @param emulatorPath - Path to the `emulator` binary
 * @returns Array of AVD name strings
 *
 * @example
 * const avds = await listAvds('/Users/me/Library/Android/sdk/emulator/emulator');
 */
export async function listAvds(emulatorPath: Str): Promise<Str[]> {
  try {
    const { stdout } = await execFileAsync(emulatorPath as string, ['-list-avds']);
    return parseAvdList(stdout as Str);
  } catch {
    /* emulator not available */
    return [];
  }
}

/**
 * Get full device profiles for all available AVDs.
 *
 * Reads each AVD's config.ini to extract dimensions, density, and API level.
 *
 * @param emulatorPath - Path to the `emulator` binary
 * @returns Array of AndroidDevice profiles
 *
 * @example
 * const devices = await getAndroidDevices('/path/to/emulator');
 */
export async function getAndroidDevices(emulatorPath: Str): Promise<AndroidDevice[]> {
  const avdNames: Str[] = await listAvds(emulatorPath);
  const avdHome: Str = (process.env.ANDROID_AVD_HOME ??
    `${process.env.HOME ?? ''}/.android/avd`) as Str;

  /**
   * Read a single AVD's config.ini and build its profile.
   *
   * @param name - AVD name
   * @returns AndroidDevice profile with dimensions or defaults
   */
  async function readAvdProfile(name: Str): Promise<AndroidDevice> {
    const configPath: Str = join(avdHome as string, `${name}.avd`, 'config.ini') as Str;
    try {
      const content: Str = (await readFile(configPath as string, 'utf8')) as Str;
      const config: Record<Str, Str> = parseConfigIni(content);
      return buildDeviceFromConfig(name, config);
    } catch {
      /* config.ini not readable — return defaults */
      return {
        name,
        width: 0 as Num,
        height: 0 as Num,
        density: 0 as Num,
        apiLevel: 0 as Num,
        displayTag: '' as Str,
      };
    }
  }

  const devicePromises: Array<Promise<AndroidDevice>> = avdNames.map(readAvdProfile);
  return Promise.all(devicePromises);
}
