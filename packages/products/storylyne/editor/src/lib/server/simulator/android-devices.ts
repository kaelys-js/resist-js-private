/**
 * Android Emulator Device Profiles
 *
 * Lists available Android Virtual Devices (AVDs), parses their config.ini
 * files for dimensions/density/API level, and provides device profile
 * information for the screenshot API response.
 *
 * Also lists all available hardware device profiles from the SDK
 * (via `avdmanager list device`) so users can create new AVDs on demand.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
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
  /** AVD name (e.g. 'Pixel_9_API_35') or display name for uncreated profiles. */
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
  /** Whether this device has an AVD created (true) or is just a hardware profile (false). */
  created: Bool;
  /** Hardware profile device ID (e.g. 'pixel_9') for AVD creation. */
  deviceId: Str;
};

/** A hardware device profile from the Android SDK (not yet an AVD). */
export type DeviceProfile = {
  /** Device ID used for AVD creation (e.g. 'pixel_9'). */
  deviceId: Str;
  /** Human-readable device name (e.g. 'Pixel 9'). */
  displayName: Str;
  /** Device OEM (e.g. 'Google', 'Generic'). */
  oem: Str;
  /** Device tag for filtering (e.g. 'android-automotive', 'ai-glasses'). */
  tag: Str;
};

/* ------------------------------------------------------------------ */
/*  Device dimensions lookup                                           */
/* ------------------------------------------------------------------ */

/**
 * Static lookup table for common Android device screen dimensions.
 * Maps device ID to pixel dimensions and density.
 */
const DEVICE_DIMENSIONS: Map<Str, { width: Num; height: Num; density: Num }> = new Map([
  /* Pixel 9 series */
  ['pixel_9' as Str, { width: 1080 as Num, height: 2424 as Num, density: 420 as Num }],
  ['pixel_9_pro' as Str, { width: 1280 as Num, height: 2856 as Num, density: 560 as Num }],
  ['pixel_9_pro_xl' as Str, { width: 1344 as Num, height: 2992 as Num, density: 560 as Num }],
  ['pixel_9_pro_fold' as Str, { width: 2076 as Num, height: 2152 as Num, density: 420 as Num }],
  ['pixel_9a' as Str, { width: 1080 as Num, height: 2424 as Num, density: 420 as Num }],
  /* Pixel 8 series */
  ['pixel_8' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  ['pixel_8_pro' as Str, { width: 1344 as Num, height: 2992 as Num, density: 560 as Num }],
  ['pixel_8a' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  /* Pixel 7 series */
  ['pixel_7' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  ['pixel_7_pro' as Str, { width: 1440 as Num, height: 3120 as Num, density: 560 as Num }],
  ['pixel_7a' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  /* Pixel 6 series */
  ['pixel_6' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  ['pixel_6_pro' as Str, { width: 1440 as Num, height: 3120 as Num, density: 560 as Num }],
  ['pixel_6a' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  /* Pixel Fold / Tablet */
  ['pixel_fold' as Str, { width: 2208 as Num, height: 1840 as Num, density: 420 as Num }],
  ['pixel_tablet' as Str, { width: 2560 as Num, height: 1600 as Num, density: 320 as Num }],
  /* Generic phones */
  ['medium_phone' as Str, { width: 1080 as Num, height: 2400 as Num, density: 420 as Num }],
  ['small_phone' as Str, { width: 720 as Num, height: 1280 as Num, density: 320 as Num }],
  /* Generic tablets */
  ['medium_tablet' as Str, { width: 1600 as Num, height: 2560 as Num, density: 320 as Num }],
]);

/* ------------------------------------------------------------------ */
/*  AVD listing                                                        */
/* ------------------------------------------------------------------ */

/**
 * Parse the output of `emulator -list-avds` into AVD name strings.
 *
 * Each non-empty line of the output is an AVD name.
 *
 * @param {Str} output - Raw stdout from `emulator -list-avds`
 * @returns {Str[]} Array of AVD names
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
 * @param {Str} content - Raw text content of config.ini
 * @returns {Record<Str, Str>} Map of configuration keys to values
 *
 * @example
 * const config = parseConfigIni('hw.lcd.width=1080\nhw.lcd.height=2400');
 * // { 'hw.lcd.width': '1080', 'hw.lcd.height': '2400' }
 */
export function parseConfigIni(content: Str): Record<Str, Str> {
  const result: Record<Str, Str> = {};

  for (const line of (content as string).split('\n')) {
    const trimmed: Str = line.trim() as Str;
    if (!(trimmed as string) || (trimmed as string).startsWith('#')) {
      continue;
    }

    const eqIndex: Num = (trimmed as string).indexOf('=') as Num;
    if ((eqIndex as number) < 0) {
      continue;
    }

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
  if (!match?.[1]) {
    return 0 as Num;
  }
  return Number.parseInt(match[1], 10) as Num;
}

/**
 * Build an AndroidDevice profile from parsed config.ini data.
 *
 * @param name - AVD name
 * @param config - Parsed config.ini key-value map
 * @param deviceId - Hardware profile device ID (if known)
 * @returns AndroidDevice profile
 */
function buildDeviceFromConfig(name: Str, config: Record<Str, Str>, deviceId?: Str): AndroidDevice {
  return {
    name,
    width: Number.parseInt((config['hw.lcd.width'] ?? '0') as string, 10) as Num,
    height: Number.parseInt((config['hw.lcd.height'] ?? '0') as string, 10) as Num,
    density: Number.parseInt((config['hw.lcd.density'] ?? '0') as string, 10) as Num,
    apiLevel: extractApiLevel(config),
    displayTag: (config['tag.display'] ?? '') as Str,
    created: true as Bool,
    deviceId: (deviceId ?? config['hw.device.name'] ?? '') as Str,
  };
}

/* ------------------------------------------------------------------ */
/*  Device profile parsing                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse the output of `avdmanager list device` into hardware device profiles.
 *
 * Each entry in the output follows the format:
 * ```
 * id: N or "device_id"
 *     Name: Display Name
 *     OEM : Manufacturer
 *     Tag : optional-tag
 * ---------
 * ```
 *
 * @param {Str} output - Raw stdout from `avdmanager list device`
 * @returns {DeviceProfile[]} Array of parsed device profiles
 *
 * @example
 * const profiles = parseDeviceProfiles('id: 46 or "pixel_9"\n    Name: Pixel 9\n...');
 */
export function parseDeviceProfiles(output: Str): DeviceProfile[] {
  const profiles: DeviceProfile[] = [];
  const lines: Str[] = (output as string).split('\n') as Str[];

  let currentId: Str | null = null;
  let currentName: Str | null = null;
  let currentOem: Str | null = null;
  let currentTag: Str = '' as Str;

  for (const line of lines) {
    const lineStr: string = line as string;
    const trimmed: string = lineStr.trim();

    /* Match id line: 'id: N or "device_id"' */
    const idMatch: RegExpMatchArray | null = trimmed.match(/^id:\s+\d+\s+or\s+"([^"]+)"/);
    if (idMatch?.[1]) {
      /* Save previous entry if complete */
      if (currentId && currentName) {
        profiles.push({
          deviceId: currentId,
          displayName: currentName,
          oem: currentOem ?? ('' as Str),
          tag: currentTag,
        });
      }
      currentId = idMatch[1] as Str;
      currentName = null;
      currentOem = null;
      currentTag = '' as Str;
      continue;
    }

    /* Match Name line */
    const nameMatch: RegExpMatchArray | null = trimmed.match(/^Name:\s+(.+)$/);
    if (nameMatch?.[1] && currentId) {
      currentName = nameMatch[1].trim() as Str;
      continue;
    }

    /* Match OEM line */
    const oemMatch: RegExpMatchArray | null = trimmed.match(/^OEM\s*:\s+(.+)$/);
    if (oemMatch?.[1] && currentId) {
      currentOem = oemMatch[1].trim() as Str;
      continue;
    }

    /* Match Tag line */
    const tagMatch: RegExpMatchArray | null = trimmed.match(/^Tag\s*:\s+(.+)$/);
    if (tagMatch?.[1] && currentId) {
      currentTag = tagMatch[1].trim() as Str;
      continue;
    }
  }

  /* Push last entry */
  if (currentId && currentName) {
    profiles.push({
      deviceId: currentId,
      displayName: currentName,
      oem: currentOem ?? ('' as Str),
      tag: currentTag,
    });
  }

  return profiles;
}

/* ------------------------------------------------------------------ */
/*  Device profile filtering                                           */
/* ------------------------------------------------------------------ */

/** Device IDs to exclude — legacy, non-phone/tablet, or impractical. */
const EXCLUDED_PREFIXES: Str[] = [
  'automotive' as Str,
  'tv_' as Str,
  'wearos' as Str,
  'desktop' as Str,
  'xr_' as Str,
  'ai_' as Str,
  'Nexus' as Str,
  'Galaxy' as Str,
] as Str[];

/** Device IDs to exclude by exact match. */
const EXCLUDED_EXACT: Set<Str> = new Set([
  'resizable' as Str,
  'pixel_c' as Str,
  'pixel_xl' as Str,
] as Str[]);

/** Legacy Pixel models (before Pixel 6). */
const LEGACY_PIXELS: Set<Str> = new Set([
  'pixel' as Str,
  'pixel_2' as Str,
  'pixel_2_xl' as Str,
  'pixel_3' as Str,
  'pixel_3_xl' as Str,
  'pixel_3a' as Str,
  'pixel_3a_xl' as Str,
  'pixel_4' as Str,
  'pixel_4_xl' as Str,
  'pixel_4a' as Str,
  'pixel_5' as Str,
] as Str[]);

/** Legacy/niche screen size profiles to exclude. */
const EXCLUDED_SIZE_PREFIXES: Str[] = [
  '2.7in' as Str,
  '3.2in' as Str,
  '3.3in' as Str,
  '3.4in' as Str,
  '3.7' as Str,
  '3.7in' as Str,
  '4in' as Str,
  '4.65in' as Str,
  '4.7in' as Str,
  '5.1in' as Str,
  '5.4in' as Str,
  '13.5in' as Str,
] as Str[];

/**
 * Filter device profiles to only phone and tablet form factors.
 *
 * Excludes automotive, TV, wearOS, desktop, XR, glasses, legacy Nexus/Galaxy,
 * pre-Pixel 6 devices, and legacy screen size profiles.
 *
 * @param {DeviceProfile[]} profiles - All device profiles from the SDK
 * @returns {DeviceProfile[]} Filtered profiles for phones and tablets only
 */
export function filterPhoneAndTabletProfiles(profiles: DeviceProfile[]): DeviceProfile[] {
  return profiles.filter((profile: DeviceProfile): boolean => {
    const id: string = profile.deviceId as string;
    const tag: string = profile.tag as string;

    /* Exclude by tag (automotive, wearos, desktop, ai-glasses, etc.) */
    if (
      tag.includes('automotive') ||
      tag.includes('wearos') ||
      tag.includes('desktop') ||
      tag.includes('glasses') ||
      tag.includes('distantdisplay') ||
      tag.includes('xr')
    ) {
      return false;
    }

    /* Exclude by device ID prefix */
    for (const prefix of EXCLUDED_PREFIXES) {
      if (id.startsWith(prefix as string)) {
        return false;
      }
    }

    /* Exclude by exact ID match */
    if (EXCLUDED_EXACT.has(id as Str)) {
      return false;
    }

    /* Exclude legacy Pixel devices */
    if (LEGACY_PIXELS.has(id as Str)) {
      return false;
    }

    /* Exclude legacy screen size profiles */
    for (const sizePrefix of EXCLUDED_SIZE_PREFIXES) {
      if (id.startsWith(sizePrefix as string)) {
        return false;
      }
    }

    return true;
  });
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * List all available AVDs using the `emulator` binary.
 *
 * @param {Str} emulatorPath - Path to the `emulator` binary
 * @returns {Promise<Str[]>} Array of AVD name strings
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
 * List all hardware device profiles available in the SDK.
 *
 * @param {Str} avdmanagerPath - Path to the `avdmanager` binary
 * @returns {Promise<DeviceProfile[]>} Array of device profiles (filtered to phones/tablets)
 *
 * @example
 * const profiles = await listDeviceProfiles('/path/to/avdmanager');
 */
export async function listDeviceProfiles(avdmanagerPath: Str): Promise<DeviceProfile[]> {
  try {
    const { stdout } = await execFileAsync(avdmanagerPath as string, ['list', 'device']);
    const allProfiles: DeviceProfile[] = parseDeviceProfiles(stdout as Str);
    return filterPhoneAndTabletProfiles(allProfiles);
  } catch {
    /* avdmanager not available */
    return [];
  }
}

/**
 * List installed system images for AVD creation.
 *
 * @param {Str} avdmanagerPath - Path to the `avdmanager` binary
 * @returns {Promise<Str[]>} Array of system image identifiers (e.g. 'system-images;android-35;google_apis;arm64-v8a')
 */
export async function listSystemImages(avdmanagerPath: Str): Promise<Str[]> {
  try {
    /* sdkmanager is in the same directory as avdmanager */
    const sdkmanagerPath: Str = (avdmanagerPath as string).replace(
      'avdmanager',
      'sdkmanager',
    ) as Str;
    const { stdout } = await execFileAsync(sdkmanagerPath as string, ['--list_installed']);
    const images: Str[] = [];
    for (const line of (stdout as string).split('\n')) {
      const trimmed: string = line.trim();
      if (trimmed.startsWith('system-images;')) {
        /* Extract the package identifier (first column, pipe-separated) */
        const parts: string[] = trimmed.split('|');
        const pkg: Str = (parts[0] ?? '').trim() as Str;
        if (pkg) {
          images.push(pkg);
        }
      }
    }
    return images;
  } catch {
    /* sdkmanager not available */
    return [];
  }
}

/**
 * Get full device profiles for all available AVDs.
 *
 * Reads each AVD's config.ini to extract dimensions, density, and API level.
 *
 * @param {Str} emulatorPath - Path to the `emulator` binary
 * @returns {Promise<AndroidDevice[]>} Array of AndroidDevice profiles
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
        created: true as Bool,
        deviceId: '' as Str,
      };
    }
  }

  const devicePromises: Array<Promise<AndroidDevice>> = avdNames.map(readAvdProfile);
  return Promise.all(devicePromises);
}

/**
 * Get all device profiles — both existing AVDs and uncreated hardware profiles.
 *
 * Returns created AVDs first (with full config data), followed by uncreated
 * hardware profiles (with dimensions from static lookup). Created AVDs that
 * match a hardware profile are deduplicated.
 *
 * @param {Str} emulatorPath - Path to the `emulator` binary
 * @param {Str} avdmanagerPath - Path to the `avdmanager` binary
 * @returns {Promise<AndroidDevice[]>} Merged array of all device profiles
 *
 * @example
 * const all = await getAndroidDeviceProfiles('/path/to/emulator', '/path/to/avdmanager');
 */
export async function getAndroidDeviceProfiles(
  emulatorPath: Str,
  avdmanagerPath: Str,
): Promise<AndroidDevice[]> {
  /* Fetch existing AVDs and hardware profiles in parallel */
  const [existingDevices, profiles]: [AndroidDevice[], DeviceProfile[]] = await Promise.all([
    getAndroidDevices(emulatorPath),
    listDeviceProfiles(avdmanagerPath),
  ]);

  /* Collect device IDs from existing AVDs for deduplication */
  const existingDeviceIds: Set<Str> = new Set<Str>();
  for (const device of existingDevices) {
    if (device.deviceId) {
      existingDeviceIds.add(device.deviceId);
    }
  }

  /* Build uncreated device entries from profiles */
  const uncreatedDevices: AndroidDevice[] = [];
  for (const profile of profiles) {
    if (existingDeviceIds.has(profile.deviceId)) {
      continue;
    }

    const dims = DEVICE_DIMENSIONS.get(profile.deviceId);
    uncreatedDevices.push({
      name: profile.displayName,
      width: dims?.width ?? (0 as Num),
      height: dims?.height ?? (0 as Num),
      density: dims?.density ?? (0 as Num),
      apiLevel: 0 as Num,
      displayTag: '' as Str,
      created: false as Bool,
      deviceId: profile.deviceId,
    });
  }

  return [...existingDevices, ...uncreatedDevices];
}

/**
 * Create a new AVD from a hardware device profile.
 *
 * Runs `avdmanager create avd` with the specified device ID and system image.
 * The AVD name is derived from the device ID with an API level suffix.
 *
 * @param {Str} avdmanagerPath - Path to the `avdmanager` binary
 * @param {Str} deviceId - Hardware profile device ID (e.g. 'pixel_9')
 * @param {Str} systemImage - System image identifier (e.g. 'system-images;android-35;google_apis;arm64-v8a')
 * @returns {Promise<Str>} The name of the created AVD
 *
 * @example
 * const name = await createAvd('/path/to/avdmanager', 'pixel_9', 'system-images;android-35;...');
 * // 'Pixel_9_API_35'
 */
export async function createAvd(
  avdmanagerPath: Str,
  deviceId: Str,
  systemImage: Str,
): Promise<Str> {
  /* Extract API level from system image identifier */
  const apiMatch: RegExpMatchArray | null = (systemImage as string).match(/android-(\d+)/);
  const apiLevel: Str = (apiMatch?.[1] ?? 'unknown') as Str;

  /* Build AVD name: capitalize device ID parts + API suffix */
  const nameParts: string[] = (deviceId as string).split('_');
  const avdName: Str = [
    ...nameParts.map((part: string): string => part.charAt(0).toUpperCase() + part.slice(1)),
    'API',
    apiLevel as string,
  ].join('_') as Str;

  /* Create the AVD — pipe 'no' to stdin to decline custom hardware profile */
  await new Promise<void>((resolve, reject) => {
    const proc = execFile(
      avdmanagerPath as string,
      [
        'create',
        'avd',
        '--name',
        avdName as string,
        '--package',
        systemImage as string,
        '--device',
        deviceId as string,
        '--force',
      ],
      (error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      },
    );
    /* Decline custom hardware profile prompt */
    proc.stdin?.write('no\n');
    proc.stdin?.end();
  });

  return avdName;
}
