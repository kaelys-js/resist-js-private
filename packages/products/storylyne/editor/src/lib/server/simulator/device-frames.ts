/**
 * Device Frame Registry
 *
 * Provides device bezel image paths and screen region descriptors
 * for compositing screenshots inside device frames. Frames are
 * SVG images stored in `static/device-frames/`.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Screen region within a device frame (CSS pixels from top-left of frame). */
export type ScreenRegion = {
  /** X offset from left edge of frame. */
  x: Num;
  /** Y offset from top edge of frame. */
  y: Num;
  /** Screen width inside frame. */
  width: Num;
  /** Screen height inside frame. */
  height: Num;
};

/** A registered device frame entry. */
export type DeviceFrame = {
  /** Unique frame identifier (kebab-case). */
  id: Str;
  /** Human-readable device name. */
  name: Str;
  /** Path to SVG bezel image (relative to static/). */
  framePath: Str;
  /** Total frame dimensions (width). */
  frameWidth: Num;
  /** Total frame dimensions (height). */
  frameHeight: Num;
  /** Screen region within the frame. */
  screenRegion: ScreenRegion;
  /** Platform this device belongs to. @values ios, android */
  platform: Str;
};

/* ------------------------------------------------------------------ */
/*  Frame registry                                                     */
/* ------------------------------------------------------------------ */

/**
 * Static registry of device frames with bezel dimensions.
 *
 * Screen regions are approximate and based on Apple/Google
 * design specs for each device model.
 */
const FRAMES: DeviceFrame[] = [
  {
    id: 'iphone-16-pro' as Str,
    name: 'iPhone 16 Pro' as Str,
    framePath: '/device-frames/iphone-16-pro.svg' as Str,
    frameWidth: 402 as Num,
    frameHeight: 874 as Num,
    screenRegion: { x: 18 as Num, y: 18 as Num, width: 366 as Num, height: 838 as Num },
    platform: 'ios' as Str,
  },
  {
    id: 'iphone-16-pro-max' as Str,
    name: 'iPhone 16 Pro Max' as Str,
    framePath: '/device-frames/iphone-16-pro-max.svg' as Str,
    frameWidth: 440 as Num,
    frameHeight: 956 as Num,
    screenRegion: { x: 18 as Num, y: 18 as Num, width: 404 as Num, height: 920 as Num },
    platform: 'ios' as Str,
  },
  {
    id: 'iphone-se' as Str,
    name: 'iPhone SE' as Str,
    framePath: '/device-frames/iphone-se.svg' as Str,
    frameWidth: 416 as Num,
    frameHeight: 796 as Num,
    screenRegion: { x: 28 as Num, y: 100 as Num, width: 360 as Num, height: 640 as Num },
    platform: 'ios' as Str,
  },
  {
    id: 'ipad-pro-13' as Str,
    name: 'iPad Pro 13"' as Str,
    framePath: '/device-frames/ipad-pro-13.svg' as Str,
    frameWidth: 1064 as Num,
    frameHeight: 1412 as Num,
    screenRegion: { x: 20 as Num, y: 20 as Num, width: 1024 as Num, height: 1372 as Num },
    platform: 'ios' as Str,
  },
  {
    id: 'pixel-9' as Str,
    name: 'Pixel 9' as Str,
    framePath: '/device-frames/pixel-9.svg' as Str,
    frameWidth: 412 as Num,
    frameHeight: 882 as Num,
    screenRegion: { x: 14 as Num, y: 14 as Num, width: 384 as Num, height: 854 as Num },
    platform: 'android' as Str,
  },
  {
    id: 'pixel-9-pro' as Str,
    name: 'Pixel 9 Pro' as Str,
    framePath: '/device-frames/pixel-9-pro.svg' as Str,
    frameWidth: 424 as Num,
    frameHeight: 922 as Num,
    screenRegion: { x: 14 as Num, y: 14 as Num, width: 396 as Num, height: 894 as Num },
    platform: 'android' as Str,
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * List all registered device frames.
 *
 * @returns {DeviceFrame[]} Array of device frame entries
 *
 * @example
 * const frames = listDeviceFrames();
 * console.log(frames[0].name); // 'iPhone 16 Pro'
 */
export function listDeviceFrames(): DeviceFrame[] {
  return FRAMES;
}

/**
 * Look up a device frame by its ID.
 *
 * @param {Str} frameId - Frame identifier (e.g. 'iphone-16-pro')
 * @returns {DeviceFrame | null} Device frame entry or null
 *
 * @example
 * const frame = getDeviceFrame('pixel-9');
 */
export function getDeviceFrame(frameId: Str): DeviceFrame | null {
  const entry: DeviceFrame | undefined = FRAMES.find((f: DeviceFrame): boolean => f.id === frameId);

  return entry ?? null;
}

/**
 * Find a matching device frame by device name (case-insensitive substring).
 *
 * Useful for automatically matching a simulator device name (e.g. 'iPhone 16 Pro')
 * to a registered frame without requiring the exact kebab-case frame ID.
 *
 * @param {Str} deviceName - Human-readable device name (e.g. 'iPhone 16 Pro Max')
 * @returns {DeviceFrame | null} Matching device frame or null
 *
 * @example
 * const frame = findDeviceFrameByName('iPhone 16 Pro');
 * // { id: 'iphone-16-pro', name: 'iPhone 16 Pro', ... }
 */
export function findDeviceFrameByName(deviceName: Str): DeviceFrame | null {
  const lower: Str = (deviceName as string).toLowerCase() as Str;
  const entry: DeviceFrame | undefined = FRAMES.find((f: DeviceFrame): boolean =>
    (lower as string).includes((f.name as string).toLowerCase()),
  );

  return entry ?? null;
}
