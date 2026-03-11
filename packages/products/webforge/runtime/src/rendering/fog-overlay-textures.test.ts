/**
 * Procedural fog overlay texture tests.
 *
 * Verifies that each of the 5 procedural texture generators (perlin, worley,
 * clouds, wisps, smoke) produces pixel data of the expected dimensions and
 * that the generated pixel data is non-blank.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import type { BabylonResult } from '../core/babylon-result';

import {
  generateOverlayTexture,
  OVERLAY_TEXTURE_NAMES,
  type OverlayTextureName,
  type TextureData,
} from './fog-overlay-textures';

// =============================================================================
// Generator Availability
// =============================================================================

describe('OVERLAY_TEXTURE_NAMES', () => {
  test('exports exactly 5 texture names', () => {
    expect(OVERLAY_TEXTURE_NAMES).toHaveLength(5);
  });

  test('contains all expected names', () => {
    const expected: readonly string[] = ['perlin', 'worley', 'clouds', 'wisps', 'smoke'];
    expect([...OVERLAY_TEXTURE_NAMES].toSorted()).toEqual([...expected].toSorted());
  });
});

// =============================================================================
// Each Texture Generator
// =============================================================================

describe.each([
  'perlin',
  'worley',
  'clouds',
  'wisps',
  'smoke',
] as const)('generateOverlayTexture("%s")', (name: OverlayTextureName) => {
  test('returns ok result', () => {
    const result: BabylonResult<TextureData> = generateOverlayTexture(name, 64);
    expect(result.ok).toBe(true);
  });

  test('produces TextureData with correct dimensions', () => {
    const result: BabylonResult<TextureData> = generateOverlayTexture(name, 64);
    if (!result.ok) return;
    expect(result.data.width).toBe(64);
    expect(result.data.height).toBe(64);
  });

  test('produces correct data length', () => {
    const result: BabylonResult<TextureData> = generateOverlayTexture(name, 64);
    if (!result.ok) return;
    // 64 * 64 pixels * 4 channels (RGBA) = 16384
    expect(result.data.data.length).toBe(64 * 64 * 4);
  });

  test('produces non-blank pixel data', () => {
    const result: BabylonResult<TextureData> = generateOverlayTexture(name, 64);
    if (!result.ok) return;
    const { data } = result.data;

    // Check that not all pixels are zero
    let hasNonZero = false;
    for (const byte of data) {
      if (byte !== 0) {
        hasNonZero = true;
        break;
      }
    }
    expect(hasNonZero).toBe(true);
  });

  test('produces default 512 size', () => {
    const result: BabylonResult<TextureData> = generateOverlayTexture(name);
    if (!result.ok) return;
    expect(result.data.width).toBe(512);
    expect(result.data.height).toBe(512);
  });

  test('pixel values are within valid range', () => {
    const result: BabylonResult<TextureData> = generateOverlayTexture(name, 64);
    if (!result.ok) return;
    const { data } = result.data;

    for (const byte of data) {
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    }
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('generateOverlayTexture error cases', () => {
  test('rejects invalid texture name', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: BabylonResult<TextureData> = generateOverlayTexture('invalid' as any, 64);
    expect(result.ok).toBe(false);
  });
});
