/**
 * Color temperature to RGB conversion — Tanner Helland approximation.
 *
 * Pure math module with no Babylon.js dependency. Converts Kelvin values
 * to RGBA colors using the Planckian locus approximation.
 *
 * @example
 * ```typescript
 * import { colorTemperatureToRgb } from './color-temperature';
 *
 * const result = colorTemperatureToRgb(2700);
 * if (result.ok) {
 *   result.data; // { r: ~1.0, g: ~0.72, b: ~0.42, a: 1 }
 * }
 * ```
 *
 * @module
 */

import type { Num } from '@/schemas/common';
import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';

import type { ColorRgba } from '../schemas/color-schema';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Clamps a value from [0, 255] to [0, 1].
 *
 * @param v - The raw value in [0, 255].
 * @returns Clamped value in [0, 1].
 */
const clampNormalize = (v: number): number => Math.min(1, Math.max(0, v / 255));

// =============================================================================
// Public API
// =============================================================================

/**
 * Converts color temperature (Kelvin) to RGB using the Tanner Helland
 * approximation of the Planckian locus.
 *
 * Pure math — no Babylon.js dependency. Valid range: [1000, 15000].
 *
 * @param kelvin - Color temperature in Kelvin.
 * @returns Result containing the RGBA color (alpha always 1).
 *
 * @example
 * ```typescript
 * const result = colorTemperatureToRgb(2700);
 * if (result.ok) {
 *   result.data; // { r: ~1.0, g: ~0.72, b: ~0.42, a: 1 }
 * }
 * ```
 */
export function colorTemperatureToRgb(kelvin: Num): Result<ColorRgba> {
  if (kelvin < 1000 || kelvin > 15_000) {
    return err(
      ERRORS.VALIDATION.INVALID_FORMAT,
      `Color temperature must be between 1000 and 15000 Kelvin, got ${String(kelvin)}`,
    );
  }

  const temp: number = kelvin / 100;
  let r: number;
  let g: number;
  let b: number;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698_727_446 * (temp - 60) ** -0.133_204_759_2;
  }

  // Green
  if (temp <= 66) {
    g = 99.470_802_586_1 * Math.log(temp) - 161.119_568_166_1;
  } else {
    g = 288.122_169_528_3 * (temp - 60) ** -0.075_514_849_2;
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.517_731_223_1 * Math.log(temp - 10) - 305.044_792_730_7;
  }

  return okUnchecked({
    r: clampNormalize(r),
    g: clampNormalize(g),
    b: clampNormalize(b),
    a: 1,
  });
}
