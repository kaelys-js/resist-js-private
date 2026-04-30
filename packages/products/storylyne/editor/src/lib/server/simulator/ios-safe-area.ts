/**
 * iOS Safe Area Inset Data
 *
 * Provides static safe area inset lookup for known iOS device models
 * and a JavaScript snippet for live measurement via WebKit Inspector
 * `Runtime.evaluate`.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Safe area inset values in CSS pixels. */
export type SafeAreaInsets = {
  /** Top inset (status bar / Dynamic Island / notch). */
  top: Num;
  /** Right inset (typically 0 in portrait). */
  right: Num;
  /** Bottom inset (home indicator). */
  bottom: Num;
  /** Left inset (typically 0 in portrait). */
  left: Num;
};

/** A known device entry with its safe area insets. */
type DeviceInsetEntry = {
  /** Device name pattern (lowercase, matched via `includes`). */
  pattern: Str;
  /** Portrait-mode safe area insets. */
  insets: SafeAreaInsets;
};

/* ------------------------------------------------------------------ */
/*  Static lookup table                                                */
/* ------------------------------------------------------------------ */

/**
 * Known safe area insets for common iOS devices (portrait mode).
 *
 * Values sourced from Apple HIG and simulator measurements.
 * Pattern matching uses lowercase `includes` for flexibility.
 */
const DEVICE_INSETS: DeviceInsetEntry[] = [
  /* Dynamic Island devices */
  {
    pattern: 'iphone 16 pro max' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 16 pro' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 16 plus' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 16' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 15 pro max' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 15 pro' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 15 plus' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 15' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 14 pro max' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 14 pro' as Str,
    insets: { top: 59 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  /* Notch devices */
  {
    pattern: 'iphone 14 plus' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 14' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 13 pro max' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 13 pro' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 13' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 12 pro max' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 12 pro' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  {
    pattern: 'iphone 12' as Str,
    insets: { top: 47 as Num, right: 0 as Num, bottom: 34 as Num, left: 0 as Num },
  },
  /* Home button devices */
  {
    pattern: 'iphone se' as Str,
    insets: { top: 20 as Num, right: 0 as Num, bottom: 0 as Num, left: 0 as Num },
  },
  /* iPads */
  {
    pattern: 'ipad pro 13' as Str,
    insets: { top: 24 as Num, right: 0 as Num, bottom: 20 as Num, left: 0 as Num },
  },
  {
    pattern: 'ipad pro 11' as Str,
    insets: { top: 24 as Num, right: 0 as Num, bottom: 20 as Num, left: 0 as Num },
  },
  {
    pattern: 'ipad air' as Str,
    insets: { top: 24 as Num, right: 0 as Num, bottom: 20 as Num, left: 0 as Num },
  },
  {
    pattern: 'ipad mini' as Str,
    insets: { top: 24 as Num, right: 0 as Num, bottom: 20 as Num, left: 0 as Num },
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Look up static safe area insets for a known iOS device model.
 *
 * Uses case-insensitive substring matching against the device name.
 * Returns `null` if no matching entry is found.
 *
 * @param {Str} deviceName - Device model name (e.g. 'iPhone 16 Pro')
 * @returns {SafeAreaInsets | null} Safe area insets or null
 *
 * @example
 * const insets = getStaticSafeAreaInsets('iPhone 16 Pro');
 * // { top: 59, right: 0, bottom: 34, left: 0 }
 */
export function getStaticSafeAreaInsets(deviceName: Str): SafeAreaInsets | null {
  const lower: Str = (deviceName as string).toLowerCase() as Str;
  const entry: DeviceInsetEntry | undefined = DEVICE_INSETS.find((e: DeviceInsetEntry): boolean =>
    (lower as string).includes(e.pattern as string),
  );

  return entry?.insets ?? null;
}

/**
 * Build a JavaScript expression for live safe area measurement.
 *
 * When evaluated in a browser context via `Runtime.evaluate`, this
 * returns a JSON string of `{ top, right, bottom, left }` with
 * numeric pixel values from CSS `env(safe-area-inset-*)`.
 *
 * @returns {Str} JavaScript expression string
 *
 * @example
 * const script = buildSafeAreaScript();
 * // Evaluate via WebKit Inspector: Runtime.evaluate({ expression: script })
 */
export function buildSafeAreaScript(): Str {
  return `JSON.stringify({
  top: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0') || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0'),
  right: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right') || '0') || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0'),
  bottom: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0') || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0'),
  left: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left') || '0') || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0')
})` as Str;
}
