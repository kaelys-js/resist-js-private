/**
 * Camera configuration schema.
 *
 * Defines the HD-2D ArcRotateCamera setup for dual mode operation:
 *
 * - **Editor mode** — free orbit, XZ panning, zero inertia for immediate response.
 * - **Gameplay mode** — locked rotation, no panning, momentum inertia for smooth feel.
 *
 * Mode-dependent defaults (inertia, panningSensibility, orbit locking) are intentionally
 * left as `v.optional()` without a default value. The `createHd2dCamera` function in
 * `camera-controller.ts` applies the correct mode default when the field is `undefined`,
 * allowing explicit user overrides to always win.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CameraConfigSchema, type CameraConfig } from './camera-config';
 *
 * // Editor mode — free orbit, zero inertia
 * const editor = safeParse(CameraConfigSchema, { mode: 'editor' });
 *
 * // Gameplay mode — locked orbit, momentum
 * const gameplay = safeParse(CameraConfigSchema, { mode: 'gameplay' });
 *
 * // Explicit override — gameplay with custom inertia
 * const custom = safeParse(CameraConfigSchema, { mode: 'gameplay', inertia: 0.3 });
 * ```
 *
 * @module
 */

import * as v from 'valibot';

/**
 * 3D axis vector for panning constraints.
 *
 * HD-2D default is `{x:1, y:0, z:1}` — restricts panning to the XZ ground plane,
 * preventing vertical drift that would break the isometric perspective.
 */
export const PanningAxisSchema = v.strictObject({
	/** X-axis panning weight (1 = enabled, 0 = disabled). */
	x: v.number(),
	/** Y-axis panning weight (1 = enabled, 0 = disabled). */
	y: v.number(),
	/** Z-axis panning weight (1 = enabled, 0 = disabled). */
	z: v.number(),
});

/** Inferred panning axis type from {@link PanningAxisSchema}. */
export type PanningAxis = v.InferOutput<typeof PanningAxisSchema>;

/**
 * HD-2D camera configuration schema.
 *
 * Only `mode` is required — all other fields have sensible HD-2D defaults.
 * Camera angles use radians. Coordinate system is Y-up left-handed (Babylon.js default).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CameraConfigSchema } from './camera-config';
 *
 * const result = safeParse(CameraConfigSchema, { mode: 'editor' });
 * if (result.ok) {
 *   result.data.alpha;  // π/4 (45° rotation)
 *   result.data.beta;   // π/4 (45° pitch — HD-2D sweet spot)
 *   result.data.radius; // 100
 * }
 * ```
 */
export const CameraConfigSchema = v.strictObject({
	/**
	 * Camera operating mode.
	 *
	 * - `'editor'` — free orbit, XZ panning, zero inertia.
	 * - `'gameplay'` — locked rotation, no panning, momentum inertia.
	 */
	mode: v.picklist(['editor', 'gameplay']),

	/** Horizontal rotation angle in radians. HD-2D default: π/4 (45°). */
	alpha: v.optional(v.number(), Math.PI / 4),

	/** Vertical pitch angle in radians. HD-2D default: π/4 (45°). */
	beta: v.optional(v.number(), Math.PI / 4),

	/** Camera distance from target. Must be ≥ 1. Default: 100. */
	radius: v.optional(v.pipe(v.number(), v.minValue(1)), 100),

	/** Minimum pitch angle in radians. Default: π/6 (30°). */
	lowerBetaLimit: v.optional(v.number(), Math.PI / 6),

	/** Maximum pitch angle in radians. Default: π/2.5 (72°). */
	upperBetaLimit: v.optional(v.number(), Math.PI / 2.5),

	/** Minimum zoom distance. Must be ≥ 1. Default: 30. */
	lowerRadiusLimit: v.optional(v.pipe(v.number(), v.minValue(1)), 30),

	/** Maximum zoom distance. Must be ≥ 1. Default: 300. */
	upperRadiusLimit: v.optional(v.pipe(v.number(), v.minValue(1)), 300),

	/** Camera target X coordinate (world space). Default: 0. */
	targetX: v.optional(v.number(), 0),

	/** Camera target Y coordinate (world space). Default: 0. */
	targetY: v.optional(v.number(), 0),

	/** Camera target Z coordinate (world space). Default: 0. */
	targetZ: v.optional(v.number(), 0),

	/** Smooth follow interpolation speed (0 = no follow, 1 = instant). Default: 0.05. */
	followSpeed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.05),

	/**
	 * Panning sensitivity. No schema default — mode default applied in `createHd2dCamera`:
	 * - Editor: 50 (enabled)
	 * - Gameplay: 0 (disabled)
	 */
	panningSensibility: v.optional(v.pipe(v.number(), v.minValue(0))),

	/** Mouse wheel zoom precision. Higher = slower zoom. Must be ≥ 1. Default: 10. */
	wheelPrecision: v.optional(v.pipe(v.number(), v.minValue(1)), 10),

	/**
	 * Camera movement inertia. No schema default — mode default applied in `createHd2dCamera`:
	 * - Editor: 0 (immediate response)
	 * - Gameplay: 0.7 (momentum)
	 */
	inertia: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),

	/** Panning axis restriction. Default: {x:1, y:0, z:1} (XZ ground plane). */
	panningAxis: v.optional(PanningAxisSchema, { x: 1, y: 0, z: 1 }),
});

/** Inferred camera configuration type from {@link CameraConfigSchema}. */
export type CameraConfig = v.InferOutput<typeof CameraConfigSchema>;
