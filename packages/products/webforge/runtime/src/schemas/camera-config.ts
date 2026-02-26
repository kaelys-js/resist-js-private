/**
 * Camera configuration schema.
 *
 * Defines a 6-preset camera system for the WebForge runtime:
 *
 * | Preset | Camera Type | Description |
 * |--------|-------------|-------------|
 * | `hd2d` | ArcRotateCamera | 45° isometric tilt, locked rotation (default) |
 * | `topdown` | ArcRotateCamera | 90° overhead, no tilt |
 * | `sideview` | ArcRotateCamera | 0° pitch, pure side-on (2D platformer) |
 * | `firstperson` | UniversalCamera | FPS-style with WASD + mouse look |
 * | `cinematic` | ArcRotateCamera | Low angle, wide FOV, heavy inertia |
 * | `free` | ArcRotateCamera | Unrestricted orbit, editor-like |
 *
 * Backward compatibility: the legacy `mode` field (`'editor'` / `'gameplay'`)
 * is still accepted. The camera controller maps `'editor'` → `'free'` and
 * `'gameplay'` → `'hd2d'` when `preset` is not explicitly set.
 *
 * Preset-dependent defaults (inertia, panningSensibility, orbit locking) are
 * intentionally left as `v.optional()` without a default value. The camera
 * controller applies the correct preset default when the field is `undefined`,
 * allowing explicit user overrides to always win.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CameraConfigSchema, type CameraConfig } from './camera-config';
 *
 * // HD-2D default (locked isometric)
 * const hd2d = safeParse(CameraConfigSchema, {});
 *
 * // Topdown overhead camera
 * const topdown = safeParse(CameraConfigSchema, { preset: 'topdown' });
 *
 * // Legacy mode (backward compatible)
 * const editor = safeParse(CameraConfigSchema, { mode: 'editor' });
 *
 * // Explicit override — cinematic with custom inertia
 * const custom = safeParse(CameraConfigSchema, { preset: 'cinematic', inertia: 0.3 });
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Camera Preset
// =============================================================================

/**
 * Camera preset identifiers.
 *
 * Each preset configures camera type, angle, orbit constraints, and input behavior.
 * The camera controller reads this value to create the appropriate camera.
 */
export const CameraPresetSchema = v.picklist([
	'hd2d',
	'topdown',
	'sideview',
	'firstperson',
	'cinematic',
	'free',
]);

/** Inferred camera preset type from {@link CameraPresetSchema}. */
export type CameraPreset = v.InferOutput<typeof CameraPresetSchema>;

// =============================================================================
// Transition Easing
// =============================================================================

/**
 * Easing functions for camera preset transitions.
 *
 * Used when smoothly transitioning between presets via `switchCameraPreset`.
 */
export const TransitionEasingSchema = v.picklist([
	'linear',
	'easeInOutCubic',
	'easeOutBack',
	'easeInOutQuad',
]);

/** Inferred transition easing type from {@link TransitionEasingSchema}. */
export type TransitionEasing = v.InferOutput<typeof TransitionEasingSchema>;

// =============================================================================
// Panning Axis
// =============================================================================

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

// =============================================================================
// Camera Config
// =============================================================================

/**
 * Camera configuration schema.
 *
 * All fields are optional — the `preset` defaults to `'hd2d'` and all
 * numeric parameters have sensible HD-2D defaults. Camera angles use radians.
 * Coordinate system is Y-up left-handed (Babylon.js default).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { CameraConfigSchema } from './camera-config';
 *
 * const result = safeParse(CameraConfigSchema, { preset: 'topdown' });
 * if (result.ok) {
 *   result.data.preset; // 'topdown'
 *   result.data.alpha;  // π/4 (45° rotation)
 *   result.data.beta;   // π/4 (45° pitch — HD-2D default)
 * }
 * ```
 */
export const CameraConfigSchema = v.strictObject({
	/**
	 * Camera preset. Determines camera type, default angles, and behavior.
	 *
	 * Default: `'hd2d'` — 45° isometric tilt, locked rotation.
	 */
	preset: v.optional(CameraPresetSchema, 'hd2d'),

	/**
	 * Legacy camera mode (backward compatibility).
	 *
	 * - `'editor'` → maps to `'free'` preset
	 * - `'gameplay'` → maps to `'hd2d'` preset
	 *
	 * When both `mode` and `preset` are provided, `preset` takes priority.
	 */
	mode: v.optional(v.picklist(['editor', 'gameplay'])),

	/**
	 * Horizontal rotation angle in radians.
	 * No schema default — preset default applied in camera controller.
	 */
	alpha: v.optional(v.number()),

	/**
	 * Vertical pitch angle in radians.
	 * No schema default — preset default applied in camera controller.
	 */
	beta: v.optional(v.number()),

	/**
	 * Camera distance from target. Must be ≥ 1.
	 * No schema default — preset default applied in camera controller.
	 */
	radius: v.optional(v.pipe(v.number(), v.minValue(1))),

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
	 * Panning sensitivity. No schema default — preset default applied in camera controller:
	 * - free: 50 (enabled)
	 * - All others: 0 (disabled)
	 */
	panningSensibility: v.optional(v.pipe(v.number(), v.minValue(0))),

	/** Mouse wheel zoom precision. Higher = slower zoom. Must be ≥ 1. Default: 3. */
	wheelPrecision: v.optional(v.pipe(v.number(), v.minValue(1)), 3),

	/**
	 * Camera movement inertia. No schema default — preset default applied in camera controller:
	 * - hd2d: 0.7
	 * - cinematic: 0.9
	 * - free: 0
	 * - Others: 0.5
	 */
	inertia: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),

	/** Panning axis restriction. Default: {x:1, y:0, z:1} (XZ ground plane). */
	panningAxis: v.optional(PanningAxisSchema, { x: 1, y: 0, z: 1 }),

	/**
	 * FF Tactics-style 4-angle rotation.
	 *
	 * When enabled, the camera snaps to 0°/90°/180°/270° angles
	 * via the `rotateTactics` function. Default: false.
	 */
	tacticsRotation: v.optional(v.boolean(), false),

	/**
	 * Duration of smooth transitions between camera presets in milliseconds.
	 *
	 * Used by `switchCameraPreset()`. Must be 0–5000. Default: 500.
	 */
	transitionDurationMs: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5000)), 500),

	/**
	 * Easing function for camera preset transitions.
	 *
	 * Default: `'easeInOutCubic'`.
	 */
	transitionEasing: v.optional(TransitionEasingSchema, 'easeInOutCubic'),
});

/** Inferred camera configuration type from {@link CameraConfigSchema}. */
export type CameraConfig = v.InferOutput<typeof CameraConfigSchema>;
