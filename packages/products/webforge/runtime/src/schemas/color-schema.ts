/**
 * Shared color and vector schemas.
 *
 * Provides reusable `ColorRgbaSchema` and `Vector3Schema` used across
 * multiple configuration schemas (scene setup, fog, lighting, sky,
 * post-processing, map data).
 *
 * Extracted into a standalone module to avoid circular dependencies
 * between configuration schemas that reference each other.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ColorRgbaSchema, Vector3Schema } from './color-schema';
 *
 * const color = safeParse(ColorRgbaSchema, { r: 0.5, g: 0.3, b: 0.8 });
 * if (color.ok) color.data.a; // 1 (default)
 *
 * const vec = safeParse(Vector3Schema, { x: 10, y: 2, z: -5 });
 * if (vec.ok) vec.data.y; // 2
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Vector3 Schema
// =============================================================================

/**
 * 3D vector with x, y, z components.
 *
 * Maps directly to Babylon.js `Vector3(x, y, z)`.
 * All components default to 0 when omitted — no min/max constraints,
 * since positions and directions can be any value.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { Vector3Schema } from './color-schema';
 *
 * const result = safeParse(Vector3Schema, { x: 10, y: 2, z: -5 });
 * if (result.ok) result.data.y; // 2
 * ```
 */
export const Vector3Schema = v.strictObject({
  /** X component. Default: 0. */
  x: v.optional(v.number(), 0),
  /** Y component. Default: 0. */
  y: v.optional(v.number(), 0),
  /** Z component. Default: 0. */
  z: v.optional(v.number(), 0),
});

/** Inferred 3D vector type from {@link Vector3Schema}. */
export type Vector3 = v.InferOutput<typeof Vector3Schema>;

// =============================================================================
// Color Schema
// =============================================================================

/**
 * RGBA color with components in [0, 1] range.
 *
 * Maps directly to Babylon.js `Color4(r, g, b, a)`.
 * Alpha defaults to 1 (fully opaque) when omitted.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ColorRgbaSchema } from './color-schema';
 *
 * const result = safeParse(ColorRgbaSchema, { r: 0.5, g: 0.3, b: 0.8 });
 * if (result.ok) result.data.a; // 1 (default)
 * ```
 */
export const ColorRgbaSchema = v.strictObject({
  /** Red channel [0, 1]. */
  r: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Green channel [0, 1]. */
  g: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Blue channel [0, 1]. */
  b: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Alpha channel [0, 1]. Defaults to 1 (opaque). */
  a: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),
});

/** Inferred RGBA color type from {@link ColorRgbaSchema}. */
export type ColorRgba = v.InferOutput<typeof ColorRgbaSchema>;
