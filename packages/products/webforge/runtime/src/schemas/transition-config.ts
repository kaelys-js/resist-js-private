/**
 * Transition configuration schema.
 *
 * Defines a 53-type screen transition system for the WebForge runtime,
 * split across two categories:
 *
 * | Category | Count | Types |
 * |-----------|-------|---------------------------------------------------|
 * | Mask-based | 22 | fade, crossFade, circleIris, diamondIris, wipe, diagonalWipe, doubleDoor, noiseDissove, ditheredFade, venetianBlinds, bars, checkerboard, radialWipe, scanlineReveal, randomBlocks, crossSplit, heartIris, starIris, crossIris, clockWipe, diagonalBlinds, bowTie |
 * | Procedural | 31 | pixelate, crtPowerOff, swirl, zoomLines, shatter, wavyDistortion, hexagonalize, pinwheel, polkaDots, gridFlip, glitch, ripple, wind, chromaticBurst, zoom, spiralWipe, curtain, dreamDissolve, filmBurn, overexposure, doomMelt, tvStatic, matrixRain, mosaic, burn, waterDrop, squeeze, flyEye, crosshatch, luminanceMelt, pageFlip |
 *
 * Each transition config includes shared parameters (duration, easing, color)
 * and type-specific parameters (direction, count, noise, etc.). All type-specific
 * params are optional with sensible defaults, allowing minimal configs like
 * `{ type: 'fade' }` to work out of the box.
 *
 * Includes 32 curated presets covering common transition types.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionConfigSchema, TRANSITION_PRESETS, type TransitionConfig } from './transition-config';
 *
 * // Minimal config — just type, everything else defaults
 * const result = safeParse(TransitionConfigSchema, { type: 'fade' });
 *
 * // Use a preset
 * const fadeToBlack = TRANSITION_PRESETS.fadeToBlack;
 *
 * // Custom config
 * const custom = safeParse(TransitionConfigSchema, {
 *   type: 'wipe',
 *   direction: 'right',
 *   durationMs: 500,
 *   easing: 'easeOut',
 * });
 * ```
 *
 * @module
 */

import * as v from 'valibot';

// =============================================================================
// Transition Type
// =============================================================================

/**
 * Transition type identifiers.
 *
 * 53 transition effects split into mask-based (22) and procedural (31).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionTypeSchema } from './transition-config';
 *
 * const result = safeParse(TransitionTypeSchema, 'circleIris');
 * if (result.ok) result.data; // 'circleIris'
 * ```
 */
export const TransitionTypeSchema = v.picklist([
	// Mask-based (22)
	'fade',
	'crossFade',
	'circleIris',
	'diamondIris',
	'wipe',
	'diagonalWipe',
	'doubleDoor',
	'noiseDissove',
	'ditheredFade',
	'venetianBlinds',
	'bars',
	'checkerboard',
	'radialWipe',
	'scanlineReveal',
	'randomBlocks',
	'crossSplit',
	'heartIris',
	'starIris',
	'crossIris',
	'clockWipe',
	'diagonalBlinds',
	'bowTie',
	// Procedural (31)
	'pixelate',
	'crtPowerOff',
	'swirl',
	'zoomLines',
	'shatter',
	'wavyDistortion',
	'hexagonalize',
	'pinwheel',
	'polkaDots',
	'gridFlip',
	'glitch',
	'ripple',
	'wind',
	'chromaticBurst',
	'zoom',
	'spiralWipe',
	'curtain',
	'dreamDissolve',
	'filmBurn',
	'overexposure',
	'doomMelt',
	'tvStatic',
	'matrixRain',
	'mosaic',
	'burn',
	'waterDrop',
	'squeeze',
	'flyEye',
	'crosshatch',
	'luminanceMelt',
	'pageFlip',
]);

/** Inferred transition type from {@link TransitionTypeSchema}. */
export type TransitionType = v.InferOutput<typeof TransitionTypeSchema>;

// =============================================================================
// Transition Easing
// =============================================================================

/**
 * Easing functions for transitions.
 *
 * Controls the acceleration curve of the transition progress.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionEasingSchema } from './transition-config';
 *
 * const result = safeParse(TransitionEasingSchema, 'easeInOut');
 * if (result.ok) result.data; // 'easeInOut'
 * ```
 */
export const TransitionEasingSchema = v.picklist([
	'linear',
	'easeIn',
	'easeOut',
	'easeInOut',
	'easeOutBack',
	'easeInOutCubic',
]);

/** Inferred transition easing type from {@link TransitionEasingSchema}. */
export type TransitionEasing = v.InferOutput<typeof TransitionEasingSchema>;

// =============================================================================
// Transition Direction
// =============================================================================

/**
 * Direction for directional transitions (wipe, bars, etc.).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionDirectionSchema } from './transition-config';
 *
 * const result = safeParse(TransitionDirectionSchema, 'right');
 * if (result.ok) result.data; // 'right'
 * ```
 */
export const TransitionDirectionSchema = v.picklist(['left', 'right', 'up', 'down']);

/** Inferred transition direction type from {@link TransitionDirectionSchema}. */
export type TransitionDirection = v.InferOutput<typeof TransitionDirectionSchema>;

// =============================================================================
// Transition Axis
// =============================================================================

/**
 * Axis for axis-aligned transitions (venetianBlinds, bars, etc.).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionAxisSchema } from './transition-config';
 *
 * const result = safeParse(TransitionAxisSchema, 'horizontal');
 * if (result.ok) result.data; // 'horizontal'
 * ```
 */
export const TransitionAxisSchema = v.picklist(['horizontal', 'vertical']);

/** Inferred transition axis type from {@link TransitionAxisSchema}. */
export type TransitionAxis = v.InferOutput<typeof TransitionAxisSchema>;

// =============================================================================
// Color3 (internal)
// =============================================================================

/**
 * RGB color with channels in the 0-1 range.
 *
 * Used for transition background color and edge color.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { Color3Schema } from './transition-config';
 *
 * const black = safeParse(Color3Schema, { r: 0, g: 0, b: 0 });
 * const white = safeParse(Color3Schema, { r: 1, g: 1, b: 1 });
 * ```
 */
export const Color3Schema = v.strictObject({
	/** Red channel. Range 0-1. */
	r: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
	/** Green channel. Range 0-1. */
	g: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
	/** Blue channel. Range 0-1. */
	b: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

/** Inferred color type from {@link Color3Schema}. */
export type Color3 = v.InferOutput<typeof Color3Schema>;

// =============================================================================
// Transition Config
// =============================================================================

/**
 * Full transition configuration schema.
 *
 * Only `type` is required — all other fields have sensible defaults.
 * Shared parameters (duration, easing, color) apply to all transition types.
 * Type-specific parameters are included as optional fields with defaults;
 * each transition type reads only the params it needs.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TransitionConfigSchema, type TransitionConfig } from './transition-config';
 *
 * // Minimal — just type
 * const minimal = safeParse(TransitionConfigSchema, { type: 'fade' });
 *
 * // Wipe with direction
 * const wipe = safeParse(TransitionConfigSchema, {
 *   type: 'wipe',
 *   direction: 'right',
 *   durationMs: 500,
 * });
 *
 * // Circle iris with custom center
 * const iris = safeParse(TransitionConfigSchema, {
 *   type: 'circleIris',
 *   centerX: 0.3,
 *   centerY: 0.7,
 *   durationMs: 800,
 * });
 * ```
 */
export const TransitionConfigSchema = v.strictObject({
	// =========================================================================
	// Required
	// =========================================================================

	/** Transition effect type. REQUIRED. */
	type: TransitionTypeSchema,

	// =========================================================================
	// Shared params (all optional with defaults)
	// =========================================================================

	/** Duration in milliseconds. Range 100-10000. Default: 1000. */
	durationMs: v.optional(v.pipe(v.number(), v.minValue(100), v.maxValue(10_000)), 1000),

	/** Easing curve for the transition progress. Default: 'easeInOut'. */
	easing: v.optional(TransitionEasingSchema, 'easeInOut'),

	/** Edge softness for mask-based transitions. Range 0-0.5. Default: 0.02. */
	edgeSoftness: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.02),

	/** Play the transition in reverse. Default: false. */
	reverse: v.optional(v.boolean(), false),

	/** Background color for the transition. Default: black {r:0, g:0, b:0}. */
	color: v.optional(Color3Schema, { r: 0, g: 0, b: 0 }),

	/** Optional edge glow/outline color. No default (undefined = no edge color). */
	edgeColor: v.optional(Color3Schema),

	// =========================================================================
	// Type-specific params (all optional with defaults)
	// =========================================================================

	/** Wipe/bars direction. Default: 'left'. */
	direction: v.optional(TransitionDirectionSchema, 'left'),

	/** Axis for venetianBlinds, bars, etc. Default: 'horizontal'. */
	axis: v.optional(TransitionAxisSchema, 'horizontal'),

	/** Whether doubleDoor/iris opens from center. Default: true. */
	openFromCenter: v.optional(v.boolean(), true),

	/** Iris/radial center X coordinate. Range 0-1. Default: 0.5. */
	centerX: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Iris/radial center Y coordinate. Range 0-1. Default: 0.5. */
	centerY: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Strip/blind count for venetianBlinds, bars. Range 2-100. Default: 10. */
	count: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(100)), 10),

	/** Grid size for checkerboard, gridFlip. Range 2-100. Default: 10. */
	gridSize: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(100)), 10),

	/** Diagonal angle in degrees for diagonalWipe. Range 0-360. Default: 45. */
	angle: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 45),

	/** Rotation direction for radialWipe, pinwheel. Default: true. */
	clockwise: v.optional(v.boolean(), true),

	/** Number of blades for pinwheel, radialWipe. Range 2-16. Default: 4. */
	bladeCount: v.optional(v.pipe(v.number(), v.minValue(2), v.maxValue(16)), 4),

	/** Noise texture scale for noiseDissove. Range 0.1-50. Default: 4. */
	noiseScale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(50)), 4),

	/** Noise seed for noiseDissove. Default: 0. */
	noiseSeed: v.optional(v.number(), 0),

	/** Dither matrix size for ditheredFade. Must be 2, 4, or 8. Default: 4. */
	matrixSize: v.optional(v.picklist([2, 4, 8]), 4),

	/** Scanline width for scanlineReveal, crtPowerOff. Range 1-16. Default: 2. */
	lineWidth: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(16)), 2),

	/** Maximum pixel block size for pixelate. Range 4-128. Default: 32. */
	maxBlockSize: v.optional(v.pipe(v.number(), v.minValue(4), v.maxValue(128)), 32),

	/** Enable CRT scanline overlay for crtPowerOff. Default: true. */
	scanlines: v.optional(v.boolean(), true),

	/** Swirl rotation strength. Range 0.5-20. Default: 5. */
	swirlStrength: v.optional(v.pipe(v.number(), v.minValue(0.5), v.maxValue(20)), 5),

	/** Swirl effect radius. Range 0.1-1. Default: 0.5. */
	swirlRadius: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(1)), 0.5),

	/** Zoom line thickness for zoomLines. Range 0.005-0.1. Default: 0.02. */
	zoomLineWidth: v.optional(v.pipe(v.number(), v.minValue(0.005), v.maxValue(0.1)), 0.02),

	/** Cell count for hexagonalize, polkaDots. Range 4-100. Default: 20. */
	cellCount: v.optional(v.pipe(v.number(), v.minValue(4), v.maxValue(100)), 20),

	/** Wave amplitude for wavyDistortion, ripple. Range 0.01-0.5. Default: 0.05. */
	amplitude: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(0.5)), 0.05),

	/** Wave frequency for wavyDistortion, ripple. Range 1-50. Default: 10. */
	frequency: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(50)), 10),

	/** Number of waves for wavyDistortion, wind. Range 1-30. Default: 8. */
	waveCount: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(30)), 8),

	/** Glitch effect intensity. Range 0-1. Default: 0.5. */
	glitchIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Number of points for starIris. Range 3-12. Default: 5. */
	pointCount: v.optional(v.pipe(v.number(), v.minValue(3), v.maxValue(12)), 5),
});

/** Inferred transition config type from {@link TransitionConfigSchema}. */
export type TransitionConfig = v.InferOutput<typeof TransitionConfigSchema>;

// =============================================================================
// Transition Presets
// =============================================================================

/**
 * Library of 32 curated transition presets.
 *
 * Each preset is a fully-specified {@link TransitionConfig} that validates
 * against {@link TransitionConfigSchema}. Presets cover all 28 transition
 * types plus common variants (fadeToBlack, fadeToWhite, wipeLeft, wipeRight,
 * wipeUp, wipeDown).
 *
 * @example
 * ```typescript
 * import { TRANSITION_PRESETS } from './transition-config';
 *
 * // Use directly
 * const config = TRANSITION_PRESETS.fadeToBlack;
 *
 * // Spread and override
 * const custom = { ...TRANSITION_PRESETS.wipeLeft, durationMs: 500 };
 * ```
 */
export const TRANSITION_PRESETS = {
	fadeToBlack: {
		type: 'fade',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	fadeToWhite: {
		type: 'fade',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 1, g: 1, b: 1 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	crossFade: {
		type: 'crossFade',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	circleIris: {
		type: 'circleIris',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	diamondIris: {
		type: 'diamondIris',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	wipeLeft: {
		type: 'wipe',
		durationMs: 600,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	wipeRight: {
		type: 'wipe',
		durationMs: 600,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'right',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	wipeUp: {
		type: 'wipe',
		durationMs: 600,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'up',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	wipeDown: {
		type: 'wipe',
		durationMs: 600,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'down',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	diagonalWipe: {
		type: 'diagonalWipe',
		durationMs: 700,
		easing: 'easeInOut',
		edgeSoftness: 0.05,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	doubleDoor: {
		type: 'doubleDoor',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	noiseDissove: {
		type: 'noiseDissove',
		durationMs: 1200,
		easing: 'easeInOut',
		edgeSoftness: 0.05,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	ditheredFade: {
		type: 'ditheredFade',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	venetianBlinds: {
		type: 'venetianBlinds',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	bars: {
		type: 'bars',
		durationMs: 700,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'vertical',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 12,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	checkerboard: {
		type: 'checkerboard',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 8,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	radialWipe: {
		type: 'radialWipe',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	scanlineReveal: {
		type: 'scanlineReveal',
		durationMs: 600,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	pixelate: {
		type: 'pixelate',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	crtPowerOff: {
		type: 'crtPowerOff',
		durationMs: 600,
		easing: 'easeIn',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	swirl: {
		type: 'swirl',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	zoomLines: {
		type: 'zoomLines',
		durationMs: 500,
		easing: 'easeIn',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	shatter: {
		type: 'shatter',
		durationMs: 800,
		easing: 'easeOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	wavyDistortion: {
		type: 'wavyDistortion',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	hexagonalize: {
		type: 'hexagonalize',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	pinwheel: {
		type: 'pinwheel',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	polkaDots: {
		type: 'polkaDots',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	gridFlip: {
		type: 'gridFlip',
		durationMs: 1000,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 8,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	glitch: {
		type: 'glitch',
		durationMs: 500,
		easing: 'linear',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	ripple: {
		type: 'ripple',
		durationMs: 1000,
		easing: 'easeOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	wind: {
		type: 'wind',
		durationMs: 800,
		easing: 'easeInOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'right',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
	chromaticBurst: {
		type: 'chromaticBurst',
		durationMs: 600,
		easing: 'easeOut',
		edgeSoftness: 0.02,
		reverse: false,
		color: { r: 0, g: 0, b: 0 },
		direction: 'left',
		axis: 'horizontal',
		openFromCenter: true,
		centerX: 0.5,
		centerY: 0.5,
		count: 10,
		gridSize: 10,
		angle: 45,
		clockwise: true,
		bladeCount: 4,
		noiseScale: 4,
		noiseSeed: 0,
		matrixSize: 4,
		lineWidth: 2,
		maxBlockSize: 32,
		scanlines: true,
		swirlStrength: 5,
		swirlRadius: 0.5,
		zoomLineWidth: 0.02,
		cellCount: 20,
		amplitude: 0.05,
		frequency: 10,
		waveCount: 8,
		glitchIntensity: 0.5,
		pointCount: 5,
	},
} as const satisfies Record<string, TransitionConfig>;
