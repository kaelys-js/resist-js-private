/**
 * Post-processing configuration schemas.
 *
 * Valibot schemas for all post-processing pipeline settings:
 * bloom, depth-of-field, tone mapping, color grading, vignette,
 * film grain, SSAO, chromatic aberration, sharpen, FXAA, dithering,
 * HDR environment, and top-level exposure/contrast.
 *
 * Each sub-schema has sensible defaults so an empty `{}` input
 * produces a complete configuration. The top-level
 * {@link PostProcessingConfigSchema} aggregates all sub-schemas
 * with a named preset selector.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { PostProcessingConfigSchema, type PostProcessingConfig } from './post-processing-config';
 *
 * const result = safeParse(PostProcessingConfigSchema, {});
 * if (result.ok) {
 *   result.data.preset;    // 'hd2d'
 *   result.data.exposure;  // 1.0
 * }
 *
 * // Override specific sub-effects
 * const custom = safeParse(PostProcessingConfigSchema, {
 *   preset: 'cinematic',
 *   bloom: { weight: 0.3 },
 *   ssao: { samples: 32 },
 * });
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ColorRgbaSchema } from './scene-setup-config';

// =============================================================================
// Bloom
// =============================================================================

/**
 * Bloom effect configuration.
 *
 * Controls the soft glow applied to bright areas of the scene.
 * Maps to `DefaultRenderingPipeline.bloomEnabled`, `.bloomWeight`,
 * `.bloomThreshold`, `.bloomKernel`, `.bloomScale`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { BloomConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(BloomConfigSchema, { weight: 0.3 });
 * if (result.ok) result.data.weight; // 0.3
 * ```
 */
export const BloomConfigSchema = v.strictObject({
	/** Whether bloom is active. */
	enabled: v.optional(v.boolean(), true),
	/** Bloom strength [0, 1]. */
	weight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.15),
	/** Luminance threshold for bright areas [0, 1]. */
	threshold: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.9),
	/** Blur kernel size [1, 512]. */
	kernel: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(512)), 64),
	/** Performance tuning scale [0.1, 1]. */
	scale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(1)), 0.5),
});

/** Bloom effect configuration type. */
export type BloomConfig = v.InferOutput<typeof BloomConfigSchema>;

// =============================================================================
// Depth of Field
// =============================================================================

/**
 * Depth-of-field (tilt-shift) configuration.
 *
 * Creates a miniature diorama effect by blurring areas outside
 * the focus plane. Maps to `DefaultRenderingPipeline.depthOfFieldEnabled`
 * and `DepthOfFieldEffect` properties.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { DepthOfFieldConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(DepthOfFieldConfigSchema, { fStop: 1.4, blurLevel: 'high' });
 * ```
 */
export const DepthOfFieldConfigSchema = v.strictObject({
	/** Whether depth-of-field is active. */
	enabled: v.optional(v.boolean(), true),
	/** Camera focal length in mm. */
	focalLength: v.optional(v.pipe(v.number(), v.minValue(0)), 50),
	/** Aperture f-stop (>= 0.1). */
	fStop: v.optional(v.pipe(v.number(), v.minValue(0.1)), 2.8),
	/** Focus plane distance in scene units. */
	focusDistance: v.optional(v.pipe(v.number(), v.minValue(0)), 2000),
	/** Blur quality level. */
	blurLevel: v.optional(v.picklist(['low', 'medium', 'high']), 'medium'),
});

/** Depth-of-field configuration type. */
export type DepthOfFieldConfig = v.InferOutput<typeof DepthOfFieldConfigSchema>;

// =============================================================================
// Tone Mapping
// =============================================================================

/**
 * Tone mapping configuration.
 *
 * Maps HDR scene values to displayable LDR range.
 * `'aces'` provides cinematic contrast, `'standard'` is a simpler curve,
 * `'khr_pbr_neutral'` follows the Khronos PBR neutral spec.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ToneMappingConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(ToneMappingConfigSchema, { type: 'aces' });
 * ```
 */
export const ToneMappingConfigSchema = v.strictObject({
	/** Whether tone mapping is active. */
	enabled: v.optional(v.boolean(), true),
	/** Tone mapping operator. */
	type: v.optional(v.picklist(['standard', 'aces', 'khr_pbr_neutral']), 'aces'),
});

/** Tone mapping configuration type. */
export type ToneMappingConfig = v.InferOutput<typeof ToneMappingConfigSchema>;

// =============================================================================
// Color Grading
// =============================================================================

/**
 * Color grading preset name.
 *
 * Each preset maps to a set of `BABYLON.ColorCurves` adjustments
 * applied via `ImageProcessingConfiguration.colorCurves`.
 */
export const ColorGradingPresetSchema = v.picklist([
	'neutral',
	'warm',
	'cool',
	'cinematic',
	'retro',
]);

/** Color grading preset name type. */
export type ColorGradingPreset = v.InferOutput<typeof ColorGradingPresetSchema>;

/**
 * Color grading configuration.
 *
 * Enables color curve adjustments via a named preset.
 * Disabled by default — the preset selector has no effect until enabled.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ColorGradingConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(ColorGradingConfigSchema, { enabled: true, preset: 'cinematic' });
 * ```
 */
export const ColorGradingConfigSchema = v.strictObject({
	/** Whether color grading is active. */
	enabled: v.optional(v.boolean(), false),
	/** Named color grading preset. */
	preset: v.optional(ColorGradingPresetSchema, 'neutral'),
});

/** Color grading configuration type. */
export type ColorGradingConfig = v.InferOutput<typeof ColorGradingConfigSchema>;

// =============================================================================
// Vignette
// =============================================================================

/**
 * Vignette configuration.
 *
 * Darkens screen edges for a cinematic focus effect.
 * Maps to `ImageProcessingConfiguration.vignetteEnabled` and related properties.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { VignetteConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(VignetteConfigSchema, { weight: 2.0 });
 * ```
 */
export const VignetteConfigSchema = v.strictObject({
	/** Whether vignette is active. */
	enabled: v.optional(v.boolean(), true),
	/** Vignette weight (darkness) [0, 10]. */
	weight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10)), 1.5),
	/** Vignette stretch [0, 25]. */
	stretch: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(25)), 0),
	/** Vignette color (RGBA). */
	color: v.optional(ColorRgbaSchema, { r: 0, g: 0, b: 0, a: 1 }),
	/** Vignette blend mode. */
	blendMode: v.optional(v.picklist(['multiply', 'opaque']), 'multiply'),
});

/** Vignette configuration type. */
export type VignetteConfig = v.InferOutput<typeof VignetteConfigSchema>;

// =============================================================================
// Film Grain
// =============================================================================

/**
 * Film grain configuration.
 *
 * Adds subtle noise for a cinematic film look.
 * Maps to `DefaultRenderingPipeline.grainEnabled` and `GrainPostProcess`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { GrainConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(GrainConfigSchema, { intensity: 15, animated: false });
 * ```
 */
export const GrainConfigSchema = v.strictObject({
	/** Whether film grain is active. */
	enabled: v.optional(v.boolean(), true),
	/** Grain intensity [0, 100]. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 5),
	/** Whether grain pattern animates per frame. */
	animated: v.optional(v.boolean(), true),
});

/** Film grain configuration type. */
export type GrainConfig = v.InferOutput<typeof GrainConfigSchema>;

// =============================================================================
// SSAO
// =============================================================================

/**
 * Screen-space ambient occlusion (SSAO2) configuration.
 *
 * Adds depth and contact shadows to geometry edges.
 * Maps to `SSAO2RenderingPipeline` properties.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SsaoConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(SsaoConfigSchema, { samples: 32, totalStrength: 1.5 });
 * ```
 */
export const SsaoConfigSchema = v.strictObject({
	/** Whether SSAO is active. */
	enabled: v.optional(v.boolean(), true),
	/** Overall AO strength [0, 3]. */
	totalStrength: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(3)), 1.0),
	/** Sampling radius [0.01, 16]. */
	radius: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(16)), 2.0),
	/** Number of AO samples (integer) [1, 64]. */
	samples: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(64)), 16),
	/** Base AO value [0, 1]. */
	base: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.1),
	/** Use expensive bilateral blur for smoother results. */
	expensiveBlur: v.optional(v.boolean(), true),
});

/** SSAO configuration type. */
export type SsaoConfig = v.InferOutput<typeof SsaoConfigSchema>;

// =============================================================================
// Chromatic Aberration
// =============================================================================

/**
 * Chromatic aberration configuration.
 *
 * Simulates lens color fringing at screen edges.
 * Maps to `DefaultRenderingPipeline.chromaticAberrationEnabled`
 * and `ChromaticAberrationPostProcess`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ChromaticAberrationConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(ChromaticAberrationConfigSchema, { enabled: true, amount: 20 });
 * ```
 */
export const ChromaticAberrationConfigSchema = v.strictObject({
	/** Whether chromatic aberration is active. */
	enabled: v.optional(v.boolean(), false),
	/** Aberration amount [0, 200]. */
	amount: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(200)), 30),
	/** Radial intensity falloff [0, 5]. */
	radialIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 0.3),
});

/** Chromatic aberration configuration type. */
export type ChromaticAberrationConfig = v.InferOutput<typeof ChromaticAberrationConfigSchema>;

// =============================================================================
// Sharpen
// =============================================================================

/**
 * Sharpen configuration.
 *
 * Edge-preserving sharpening filter.
 * Maps to `DefaultRenderingPipeline.sharpenEnabled` and `SharpenPostProcess`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SharpenConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(SharpenConfigSchema, { enabled: true, edgeAmount: 0.5 });
 * ```
 */
export const SharpenConfigSchema = v.strictObject({
	/** Whether sharpening is active. */
	enabled: v.optional(v.boolean(), false),
	/** Edge sharpening amount [0, 2]. */
	edgeAmount: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 0.3),
	/** Color sharpening amount [0, 1]. */
	colorAmount: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1.0),
});

/** Sharpen configuration type. */
export type SharpenConfig = v.InferOutput<typeof SharpenConfigSchema>;

// =============================================================================
// FXAA
// =============================================================================

/**
 * FXAA (fast approximate anti-aliasing) configuration.
 *
 * Lightweight post-process AA pass.
 * Maps to `DefaultRenderingPipeline.fxaaEnabled`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { FxaaConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(FxaaConfigSchema, { enabled: false });
 * ```
 */
export const FxaaConfigSchema = v.strictObject({
	/** Whether FXAA is active. */
	enabled: v.optional(v.boolean(), true),
});

/** FXAA configuration type. */
export type FxaaConfig = v.InferOutput<typeof FxaaConfigSchema>;

// =============================================================================
// Dithering
// =============================================================================

/**
 * Dithering configuration.
 *
 * Reduces color banding in gradients by adding subtle noise.
 * Maps to `ImageProcessingConfiguration.ditheringEnabled` and `.ditheringIntensity`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { DitheringConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(DitheringConfigSchema, { enabled: true, intensity: 0.01 });
 * ```
 */
export const DitheringConfigSchema = v.strictObject({
	/** Whether dithering is active. */
	enabled: v.optional(v.boolean(), false),
	/** Dithering intensity [0, 1]. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.004),
});

/** Dithering configuration type. */
export type DitheringConfig = v.InferOutput<typeof DitheringConfigSchema>;

// =============================================================================
// HDR Environment
// =============================================================================

/**
 * HDR environment (IBL) configuration.
 *
 * Loads an HDR cubemap for image-based lighting (no visible skybox).
 * The environment texture provides indirect lighting and reflections.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { HdrEnvironmentConfigSchema } from './post-processing-config';
 *
 * const result = safeParse(HdrEnvironmentConfigSchema, {
 *   enabled: true,
 *   texturePath: 'environments/studio.hdr',
 * });
 * ```
 */
export const HdrEnvironmentConfigSchema = v.strictObject({
	/** Whether HDR environment is active. */
	enabled: v.optional(v.boolean(), false),
	/** Path to HDR cubemap file. */
	texturePath: v.optional(v.string(), ''),
	/** Environment intensity [0, 5]. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 1.0),
	/** Y-axis rotation in radians [0, 2*PI]. */
	rotationY: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(6.2832)), 0),
});

/** HDR environment configuration type. */
export type HdrEnvironmentConfig = v.InferOutput<typeof HdrEnvironmentConfigSchema>;

// =============================================================================
// Named Preset
// =============================================================================

/**
 * Post-processing preset name.
 *
 * Each preset provides a complete set of default values for all effects.
 * Per-effect overrides are deep-merged on top of the preset base.
 */
export const PostProcessingPresetSchema = v.picklist([
	'neutral',
	'hd2d',
	'cinematic',
	'retro',
	'fantasy',
]);

/** Post-processing preset name type. */
export type PostProcessingPresetName = v.InferOutput<typeof PostProcessingPresetSchema>;

// =============================================================================
// Top-Level Config
// =============================================================================

/**
 * Complete post-processing pipeline configuration.
 *
 * Aggregates all effect sub-schemas with a named preset selector.
 * All fields are optional — empty `{}` yields the `'hd2d'` preset
 * with sensible defaults for all effects.
 *
 * Sub-schemas are optional so callers can specify only the effects
 * they want to override. The resolver merges per-map overrides
 * on top of the preset base.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { PostProcessingConfigSchema, type PostProcessingConfig } from './post-processing-config';
 *
 * // All defaults
 * const result = safeParse(PostProcessingConfigSchema, {});
 *
 * // Override specific effects
 * const custom = safeParse(PostProcessingConfigSchema, {
 *   preset: 'cinematic',
 *   bloom: { weight: 0.3 },
 *   exposure: 0.9,
 * });
 * ```
 */
export const PostProcessingConfigSchema = v.strictObject({
	/** Master enable/disable for the entire pipeline. */
	enabled: v.optional(v.boolean(), true),
	/** Named preset (base values for all effects). */
	preset: v.optional(PostProcessingPresetSchema, 'hd2d'),
	/** Bloom (soft glow on bright areas). */
	bloom: v.optional(BloomConfigSchema),
	/** Depth-of-field (tilt-shift diorama effect). */
	depthOfField: v.optional(DepthOfFieldConfigSchema),
	/** Tone mapping (HDR → LDR). */
	toneMapping: v.optional(ToneMappingConfigSchema),
	/** Color grading (color curve presets). */
	colorGrading: v.optional(ColorGradingConfigSchema),
	/** Vignette (darkened screen edges). */
	vignette: v.optional(VignetteConfigSchema),
	/** Film grain (subtle noise). */
	grain: v.optional(GrainConfigSchema),
	/** Screen-space ambient occlusion. */
	ssao: v.optional(SsaoConfigSchema),
	/** Chromatic aberration (lens color fringing). */
	chromaticAberration: v.optional(ChromaticAberrationConfigSchema),
	/** Sharpen (edge-preserving sharpening). */
	sharpen: v.optional(SharpenConfigSchema),
	/** FXAA (fast approximate anti-aliasing). */
	fxaa: v.optional(FxaaConfigSchema),
	/** Dithering (reduce color banding). */
	dithering: v.optional(DitheringConfigSchema),
	/** HDR environment (image-based lighting). */
	hdrEnvironment: v.optional(HdrEnvironmentConfigSchema),
	/** Scene exposure. */
	exposure: v.optional(v.number(), 1.0),
	/** Scene contrast. */
	contrast: v.optional(v.number(), 1.0),
});

/** Complete post-processing configuration type. */
export type PostProcessingConfig = v.InferOutput<typeof PostProcessingConfigSchema>;
