/**
 * Screenshot Devices API — Available Playwright Device Profiles
 *
 * Returns all device profiles from Playwright's built-in registry
 * for use in the LensComponentRenderer "Browser & Device Preview" submenu.
 * Each device includes viewport dimensions, scale factor, touch/mobile
 * flags, recommended browser engine, and OS version extracted from UA.
 *
 * Dev-only — returns 404 in production builds.
 *
 * @module
 */

import type { RequestHandler } from './$types';
import type { Num, Str, Bool } from '@/schemas/common';
import { dev } from '$app/environment';

/** Minimal device descriptor for the UI. */
type DeviceInfo = {
  /** Playwright device name (exact key for the screenshot API). */
  name: Str;
  /** Viewport width in CSS pixels. */
  width: Num;
  /** Viewport height in CSS pixels. */
  height: Num;
  /** Device pixel ratio. */
  scale: Num;
  /** Whether the device emulates a mobile browser. */
  mobile: Bool;
  /** Whether the device supports touch events. */
  touch: Bool;
  /** Recommended browser engine for this device. */
  defaultBrowser: Str;
  /** OS/platform string extracted from user agent (e.g., 'iOS 17.5', 'Android 14'). */
  os: Str;
};

/** Cached device list — computed once per server lifecycle. */
let cache: DeviceInfo[] | null = null;

/**
 * Extract OS name and version from a user agent string.
 *
 * @param ua - Browser user agent string
 * @param name - Device name for fallback categorization
 * @returns Human-readable OS string (e.g., 'iOS 17.5', 'Android 14')
 */
function extractOS(ua: Str, name: Str): Str {
  /* iOS — "CPU iPhone OS 17_5 like Mac OS X" or "CPU OS 17_5 like Mac OS X" */
  const iosMatch: RegExpMatchArray | null = ua.match(/CPU (?:iPhone )?OS (\d+[_.\d]*)/);

  if (iosMatch) {
    return `iOS ${iosMatch[1].replaceAll('_', '.')}` as Str;
  }

  /* Android — "Android 14" */
  const androidMatch: RegExpMatchArray | null = ua.match(/Android (\d+[.\d]*)/);

  if (androidMatch) {
    return `Android ${androidMatch[1]}` as Str;
  }

  /* Desktop fallbacks by device name patterns */
  if (name.toLowerCase().includes('iphone') || name.toLowerCase().includes('ipad')) {
    return 'iOS' as Str;
  }
  if (name.toLowerCase().includes('pixel') || name.toLowerCase().includes('galaxy')) {
    return 'Android' as Str;
  }

  /* Desktop browser entries */
  if (ua.includes('Macintosh')) {
    return 'macOS' as Str;
  }
  if (ua.includes('Windows')) {
    return 'Windows' as Str;
  }
  if (ua.includes('Linux')) {
    return 'Linux' as Str;
  }

  return '' as Str;
}

/**
 * Build the device list from Playwright's registry.
 *
 * @returns Array of device descriptors sorted by name
 */
async function buildDeviceList(): Promise<DeviceInfo[]> {
  const pw = await import('playwright');
  const entries: DeviceInfo[] = [];

  for (const [name, descriptor] of Object.entries(pw.devices)) {
    const ua: Str = ((descriptor.userAgent as Str) ?? '') as Str;
    entries.push({
      name: name as Str,
      width: (descriptor.viewport?.width ?? 0) as Num,
      height: (descriptor.viewport?.height ?? 0) as Num,
      scale: (descriptor.deviceScaleFactor ?? 1) as Num,
      mobile: (descriptor.isMobile ?? false) as Bool,
      touch: (descriptor.hasTouch ?? false) as Bool,
      defaultBrowser: (descriptor.defaultBrowserType ?? 'chromium') as Str,
      os: extractOS(ua, name as Str),
    });
  }

  entries.sort((a: DeviceInfo, b: DeviceInfo): Num => a.name.localeCompare(b.name) as Num);

  return entries;
}

/**
 * GET handler — returns all available Playwright device profiles.
 *
 * @returns JSON array of device descriptors
 */
export const GET: RequestHandler = async () => {
  if (!dev) {
    return new Response('Devices API is dev-only', { status: 404 });
  }

  if (!cache) {
    cache = await buildDeviceList();
  }

  return new Response(JSON.stringify(cache), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};
