/**
 * Lighting configuration schemas.
 *
 * Defines the full lighting system for HD-2D maps: four Babylon.js light
 * types (point, spot, directional, hemispheric) via discriminated union,
 * per-light shadow generators (PCF/PCSS/Cascade), procedural flicker
 * animations (7 presets with color shift and position jitter), a day/night
 * cycle with keyframe interpolation and procedural sun path, GlowLayer
 * for magical effects, volumetric light scattering (god rays), SpotLight
 * projector textures, and lens flares.
 *
 * All lighting is configurable per-map via the `LightingConfig` schema
 * on `MapData`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { LightingConfigSchema, type LightingConfig } from './lighting-config';
 *
 * const result = safeParse(LightingConfigSchema, {
 *   lights: [
 *     { id: 'sun', type: 'directional', intensity: 0.8,
 *       direction: { x: -0.5, y: -1, z: 0.3 },
 *       shadow: { enabled: true, type: 'cascade' } },
 *     { id: 'torch', type: 'point', colorTemperature: 2200,
 *       flicker: { type: 'torch', intensity: 0.25 } },
 *   ],
 *   glow: { enabled: true, intensity: 0.3 },
 * });
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ColorRgbaSchema, Vector3Schema } from './scene-setup-config';

// =============================================================================
// Flicker Schemas
// =============================================================================

/**
 * Flicker animation type picklist.
 *
 * Seven procedural patterns for fire, pulse, and electrical effects:
 * - `'candle'` — irregular, high-frequency flicker (multi-harmonic sine + noise)
 * - `'torch'` — slower, broader flicker than candle
 * - `'campfire'` — slow rolling intensity with occasional flare
 * - `'pulse'` — smooth sinusoidal oscillation
 * - `'strobe'` — binary on/off at high frequency
 * - `'breathing'` — very slow, gentle sine wave
 * - `'fluorescent'` — mostly steady with rare sudden dips
 */
export const FlickerTypeSchema = v.picklist([
	'candle',
	'torch',
	'campfire',
	'pulse',
	'strobe',
	'breathing',
	'fluorescent',
]);

/** Inferred flicker type from {@link FlickerTypeSchema}. */
export type FlickerType = v.InferOutput<typeof FlickerTypeSchema>;

/**
 * Flicker animation configuration.
 *
 * Controls per-frame intensity modulation, color temperature shift,
 * and position jitter for fire/light animation effects.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { FlickerConfigSchema } from './lighting-config';
 *
 * const result = safeParse(FlickerConfigSchema, {
 *   type: 'torch', intensity: 0.25, speed: 1.2,
 *   colorShift: true, colorShiftRange: 150, positionJitter: 0.02,
 * });
 * ```
 */
export const FlickerConfigSchema = v.strictObject({
	/** Whether flicker is active. Default: true. */
	enabled: v.optional(v.boolean(), true),

	/** Flicker pattern type. Default: 'candle'. */
	type: v.optional(FlickerTypeSchema, 'candle'),

	/** Flicker amplitude — how much intensity varies [0, 1]. Default: 0.3. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.3),

	/** Speed multiplier — higher = faster flicker [0.1, 10]. Default: 1.0. */
	speed: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1.0),

	/** When true, diffuse color temperature oscillates with intensity. Default: false. */
	colorShift: v.optional(v.boolean(), false),

	/** Kelvin range of color temperature oscillation [0, 500]. Default: 200. */
	colorShiftRange: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(500)), 200),

	/** Position jitter radius (Point/Spot only) [0, 1]. Default: 0. */
	positionJitter: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),
});

/** Inferred flicker configuration type from {@link FlickerConfigSchema}. */
export type FlickerConfig = v.InferOutput<typeof FlickerConfigSchema>;

// =============================================================================
// Light Falloff & Intensity Mode Schemas
// =============================================================================

/**
 * Light falloff type picklist.
 *
 * Controls how light intensity decreases with distance:
 * - `'default'` — adapts to material type automatically
 * - `'physical'` — inverse-square law (1/r²), realistic for PBR
 * - `'gltf'` — glTF standard falloff for imported models
 * - `'standard'` — legacy StandardMaterial falloff
 */
export const LightFalloffTypeSchema = v.picklist(['default', 'physical', 'gltf', 'standard']);

/** Inferred falloff type from {@link LightFalloffTypeSchema}. */
export type LightFalloffType = v.InferOutput<typeof LightFalloffTypeSchema>;

/**
 * Light intensity mode picklist.
 *
 * Physical units for PBR realism:
 * - `'automatic'` — default per light type
 * - `'luminous_power'` — lumens (lm)
 * - `'luminous_intensity'` — candela (lm/sr)
 * - `'illuminance'` — lux (lm/m²)
 * - `'luminance'` — nit (cd/m²)
 */
export const LightIntensityModeSchema = v.picklist([
	'automatic',
	'luminous_power',
	'luminous_intensity',
	'illuminance',
	'luminance',
]);

/** Inferred intensity mode type from {@link LightIntensityModeSchema}. */
export type LightIntensityMode = v.InferOutput<typeof LightIntensityModeSchema>;

// =============================================================================
// Shadow Schemas
// =============================================================================

/**
 * Shadow generator type picklist.
 *
 * - `'pcf'` — Percentage Closer Filtering (fast, good quality)
 * - `'pcss'` — Percentage Closer Soft Shadows (contact hardening)
 * - `'cascade'` — Cascaded Shadow Maps (DirectionalLight only, large scenes)
 */
export const ShadowTypeSchema = v.picklist(['pcf', 'pcss', 'cascade']);

/** Inferred shadow type from {@link ShadowTypeSchema}. */
export type ShadowType = v.InferOutput<typeof ShadowTypeSchema>;

/**
 * Shadow filtering quality picklist.
 *
 * Maps to `ShadowGenerator.QUALITY_LOW/MEDIUM/HIGH`.
 */
export const ShadowFilterQualitySchema = v.picklist(['low', 'medium', 'high']);

/** Inferred shadow filter quality from {@link ShadowFilterQualitySchema}. */
export type ShadowFilterQuality = v.InferOutput<typeof ShadowFilterQualitySchema>;

/**
 * Shadow map size picklist (power-of-two values).
 *
 * Larger = higher quality shadows but more GPU memory.
 */
export const ShadowMapSizeSchema = v.picklist([256, 512, 1024, 2048, 4096]);

/** Inferred shadow map size from {@link ShadowMapSizeSchema}. */
export type ShadowMapSize = v.InferOutput<typeof ShadowMapSizeSchema>;

/**
 * Per-light shadow configuration.
 *
 * Supports PCF, PCSS, and Cascaded Shadow Maps with fine-grained
 * control over bias, filtering quality, cascade blending, and
 * soft transparent shadows for foliage/cloth.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ShadowConfigSchema } from './lighting-config';
 *
 * const result = safeParse(ShadowConfigSchema, {
 *   enabled: true, type: 'cascade', mapSize: 2048,
 *   filteringQuality: 'high', darkness: 0.4,
 * });
 * ```
 */
export const ShadowConfigSchema = v.strictObject({
	/** Whether shadows are enabled for this light. Default: false. */
	enabled: v.optional(v.boolean(), false),

	/** Shadow generator type. Default: 'pcf'. */
	type: v.optional(ShadowTypeSchema, 'pcf'),

	/** Shadow map resolution (power of two). Default: 1024. */
	mapSize: v.optional(ShadowMapSizeSchema, 1024),

	/** PCF/PCSS filtering quality. Default: 'medium'. */
	filteringQuality: v.optional(ShadowFilterQualitySchema, 'medium'),

	/** Depth bias to prevent shadow acne [0, 1]. Default: 0.000_05. */
	bias: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.000_05),

	/** Normal bias to prevent peter-panning [0, 1]. Default: 0.04. */
	normalBias: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.04),

	/** Shadow darkness (0 = invisible, 1 = pitch black) [0, 1]. Default: 0.5. */
	darkness: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Whether to render transparent objects in shadow map. Default: false. */
	transparencyShadow: v.optional(v.boolean(), false),

	/** Dithered soft shadows for foliage/cloth. Default: false. */
	enableSoftTransparentShadow: v.optional(v.boolean(), false),

	/** Number of shadow cascades (cascade type only) [1, 4]. Default: 3. */
	numCascades: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4)), 3),

	/** Prevents cascade shimmer on camera rotation. Default: true. */
	stabilizeCascades: v.optional(v.boolean(), true),

	/** Smooth transitions between cascade levels [0, 1]. Default: 0.05. */
	cascadeBlendPercentage: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.05),

	/** Auto-optimize shadow frustum per frame. Default: true. */
	autoCalcDepthBounds: v.optional(v.boolean(), true),
});

/** Inferred shadow configuration type from {@link ShadowConfigSchema}. */
export type ShadowConfig = v.InferOutput<typeof ShadowConfigSchema>;

// =============================================================================
// Volumetric Light (God Rays) Schema
// =============================================================================

/**
 * Volumetric light scattering (god rays) configuration.
 *
 * Uses Babylon.js `VolumetricLightScatteringPostProcess` on DirectionalLight.
 * Optional and GPU-intensive — configurable quality via samples and passRatio.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { VolumetricLightConfigSchema } from './lighting-config';
 *
 * const result = safeParse(VolumetricLightConfigSchema, {
 *   enabled: true, samples: 80, passRatio: 0.5,
 * });
 * ```
 */
export const VolumetricLightConfigSchema = v.strictObject({
	/** Whether god rays are enabled. Default: false. */
	enabled: v.optional(v.boolean(), false),

	/** Ray sampling quality — higher = better, more GPU [10, 200]. Default: 100. */
	samples: v.optional(v.pipe(v.number(), v.integer(), v.minValue(10), v.maxValue(200)), 100),

	/** Light falloff along ray [0, 1]. Default: 0.97. */
	decay: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.97),

	/** Ray brightness [0, 1]. Default: 0.5. */
	weight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Ray density [0, 1]. Default: 0.5. */
	density: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

	/** Internal render target resolution ratio (0, 1]. Default: 0.5. */
	passRatio: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(1)), 0.5),
});

/** Inferred volumetric light config type from {@link VolumetricLightConfigSchema}. */
export type VolumetricLightConfig = v.InferOutput<typeof VolumetricLightConfigSchema>;

// =============================================================================
// Lens Flare Schema
// =============================================================================

/**
 * Single lens flare element.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { LensFlareEntrySchema } from './lighting-config';
 *
 * const result = safeParse(LensFlareEntrySchema, {
 *   size: 0.5, position: 0, color: { r: 1, g: 1, b: 1 },
 * });
 * ```
 */
export const LensFlareEntrySchema = v.strictObject({
	/** Flare element size [0, 2]. */
	size: v.pipe(v.number(), v.minValue(0), v.maxValue(2)),

	/** Position along flare line [-1, 1] (0 = at emitter). */
	position: v.pipe(v.number(), v.minValue(-1), v.maxValue(1)),

	/** Flare element color. */
	color: ColorRgbaSchema,
});

/** Inferred lens flare entry type from {@link LensFlareEntrySchema}. */
export type LensFlareEntry = v.InferOutput<typeof LensFlareEntrySchema>;

/**
 * Lens flare system configuration for DirectionalLight (sun effects).
 *
 * When `flares` is omitted, a default 3-flare set is used at runtime.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { LensFlareConfigSchema } from './lighting-config';
 *
 * const result = safeParse(LensFlareConfigSchema, { enabled: true });
 * ```
 */
export const LensFlareConfigSchema = v.strictObject({
	/** Whether lens flares are enabled. Default: false. */
	enabled: v.optional(v.boolean(), false),

	/** Custom flare elements. Omit for default 3-flare set. */
	flares: v.optional(v.array(LensFlareEntrySchema)),
});

/** Inferred lens flare config type from {@link LensFlareConfigSchema}. */
export type LensFlareConfig = v.InferOutput<typeof LensFlareConfigSchema>;

// =============================================================================
// Light Type Schemas (Discriminated Union)
// =============================================================================

/**
 * PointLight configuration.
 *
 * Emits light in all directions from a position. Supports shadows,
 * flicker, mesh inclusion radius, and color temperature.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { PointLightConfigSchema } from './lighting-config';
 *
 * const result = safeParse(PointLightConfigSchema, {
 *   id: 'torch-1', type: 'point',
 *   position: { x: 10, y: 2, z: 10 },
 *   colorTemperature: 2200, range: 15,
 *   flicker: { type: 'torch', intensity: 0.25 },
 * });
 * ```
 */
export const PointLightConfigSchema = v.strictObject({
	/** Discriminator: 'point'. */
	type: v.literal('point'),

	// --- Common fields ---
	/** Unique light identifier (required). */
	id: v.pipe(v.string(), v.nonEmpty()),
	/** Display name (optional). */
	name: v.optional(v.pipe(v.string(), v.nonEmpty())),
	/** Whether this light is active. Default: true. */
	enabled: v.optional(v.boolean(), true),
	/** Light intensity [0, 100]. Default: 1.0. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 1.0),
	/** Diffuse color. Default: white. */
	diffuse: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	/** Specular color. Default: white. */
	specular: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	/** Color temperature in Kelvin [1000, 15000]. Overrides diffuse when set. */
	colorTemperature: v.optional(v.pipe(v.number(), v.minValue(1000), v.maxValue(15_000))),
	/** Falloff type. Default: 'default'. */
	falloffType: v.optional(LightFalloffTypeSchema, 'default'),
	/** Intensity mode (physical units). Default: 'automatic'. */
	intensityMode: v.optional(LightIntensityModeSchema, 'automatic'),
	/** Shadow configuration. */
	shadow: v.optional(ShadowConfigSchema),
	/** Flicker animation configuration. */
	flicker: v.optional(FlickerConfigSchema),

	// --- PointLight-specific fields ---
	/** Light position in world space. Default: origin. */
	position: v.optional(Vector3Schema, { x: 0, y: 0, z: 0 }),
	/** Maximum light range (distance falloff). Default: 100. */
	range: v.optional(v.pipe(v.number(), v.minValue(0)), 100),
	/** Auto-assign includedOnlyMeshes within this radius. 0 or undefined = no culling. */
	meshRadius: v.optional(v.pipe(v.number(), v.minValue(0))),
});

/** Inferred PointLight config type from {@link PointLightConfigSchema}. */
export type PointLightConfig = v.InferOutput<typeof PointLightConfigSchema>;

/**
 * SpotLight configuration.
 *
 * Emits a cone of light from a position in a direction. Supports
 * projection textures (stained glass, patterns), shadows, flicker,
 * and mesh inclusion radius.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SpotLightConfigSchema } from './lighting-config';
 *
 * const result = safeParse(SpotLightConfigSchema, {
 *   id: 'spot-1', type: 'spot',
 *   position: { x: 5, y: 10, z: 5 },
 *   direction: { x: 0, y: -1, z: 0 },
 *   angle: 0.8, exponent: 3,
 *   projectionTexturePath: 'textures/stained-glass.png',
 * });
 * ```
 */
export const SpotLightConfigSchema = v.strictObject({
	/** Discriminator: 'spot'. */
	type: v.literal('spot'),

	// --- Common fields ---
	id: v.pipe(v.string(), v.nonEmpty()),
	name: v.optional(v.pipe(v.string(), v.nonEmpty())),
	enabled: v.optional(v.boolean(), true),
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 1.0),
	diffuse: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	specular: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	colorTemperature: v.optional(v.pipe(v.number(), v.minValue(1000), v.maxValue(15_000))),
	falloffType: v.optional(LightFalloffTypeSchema, 'default'),
	intensityMode: v.optional(LightIntensityModeSchema, 'automatic'),
	shadow: v.optional(ShadowConfigSchema),
	flicker: v.optional(FlickerConfigSchema),

	// --- SpotLight-specific fields ---
	/** Light position in world space. Default: origin. */
	position: v.optional(Vector3Schema, { x: 0, y: 0, z: 0 }),
	/** Light direction. Default: pointing down. */
	direction: v.optional(Vector3Schema, { x: 0, y: -1, z: 0 }),
	/** Cone width in radians [0, PI]. Default: PI/4. */
	angle: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(Math.PI)), Math.PI / 4),
	/** Falloff speed from center to cone edge. Default: 2. */
	exponent: v.optional(v.pipe(v.number(), v.minValue(0)), 2),
	/** Maximum light range. Default: 100. */
	range: v.optional(v.pipe(v.number(), v.minValue(0)), 100),
	/** Auto-assign includedOnlyMeshes within this radius. */
	meshRadius: v.optional(v.pipe(v.number(), v.minValue(0))),
	/** Path to projection texture image (stained glass, patterns). */
	projectionTexturePath: v.optional(v.string()),
	/** Projection texture near clip distance. Default: 0.1. */
	projectionTextureNear: v.optional(v.pipe(v.number(), v.minValue(0)), 0.1),
	/** Projection texture far clip distance. Default: 100. */
	projectionTextureFar: v.optional(v.pipe(v.number(), v.minValue(0)), 100),
});

/** Inferred SpotLight config type from {@link SpotLightConfigSchema}. */
export type SpotLightConfig = v.InferOutput<typeof SpotLightConfigSchema>;

/**
 * DirectionalLight configuration.
 *
 * Parallel light rays from a direction (sun/moon). Supports cascaded
 * shadow maps, volumetric light scattering (god rays), and lens flares.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { DirectionalLightConfigSchema } from './lighting-config';
 *
 * const result = safeParse(DirectionalLightConfigSchema, {
 *   id: 'sun', type: 'directional',
 *   direction: { x: -0.5, y: -1, z: 0.3 },
 *   shadow: { enabled: true, type: 'cascade', mapSize: 2048 },
 *   volumetricLight: { enabled: true },
 *   lensFlare: { enabled: true },
 * });
 * ```
 */
export const DirectionalLightConfigSchema = v.strictObject({
	/** Discriminator: 'directional'. */
	type: v.literal('directional'),

	// --- Common fields ---
	id: v.pipe(v.string(), v.nonEmpty()),
	name: v.optional(v.pipe(v.string(), v.nonEmpty())),
	enabled: v.optional(v.boolean(), true),
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 1.0),
	diffuse: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	specular: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	colorTemperature: v.optional(v.pipe(v.number(), v.minValue(1000), v.maxValue(15_000))),
	falloffType: v.optional(LightFalloffTypeSchema, 'default'),
	intensityMode: v.optional(LightIntensityModeSchema, 'automatic'),
	shadow: v.optional(ShadowConfigSchema),
	flicker: v.optional(FlickerConfigSchema),

	// --- DirectionalLight-specific fields ---
	/** Light direction. Default: slightly angled downward. */
	direction: v.optional(Vector3Schema, { x: 0, y: -1, z: 0.5 }),
	/** Light position (affects shadow origin). Default: high above origin. */
	position: v.optional(Vector3Schema, { x: 0, y: 50, z: 0 }),
	/** Auto-calculate shadow depth bounds from scene. Default: true. */
	autoCalcShadowZBounds: v.optional(v.boolean(), true),
	/** Volumetric light scattering (god rays) configuration. */
	volumetricLight: v.optional(VolumetricLightConfigSchema),
	/** Lens flare system configuration. */
	lensFlare: v.optional(LensFlareConfigSchema),
});

/** Inferred DirectionalLight config type from {@link DirectionalLightConfigSchema}. */
export type DirectionalLightConfig = v.InferOutput<typeof DirectionalLightConfigSchema>;

/**
 * HemisphericLight configuration.
 *
 * Ambient lighting from sky and ground directions. Does NOT support
 * shadows or flicker — hemispheric lights are purely ambient.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { HemisphericLightConfigSchema } from './lighting-config';
 *
 * const result = safeParse(HemisphericLightConfigSchema, {
 *   id: 'ambient', type: 'hemispheric',
 *   direction: { x: 0, y: 1, z: 0 },
 *   groundColor: { r: 0.2, g: 0.2, b: 0.2 },
 * });
 * ```
 */
export const HemisphericLightConfigSchema = v.strictObject({
	/** Discriminator: 'hemispheric'. */
	type: v.literal('hemispheric'),

	// --- Common fields (no shadow, no flicker) ---
	id: v.pipe(v.string(), v.nonEmpty()),
	name: v.optional(v.pipe(v.string(), v.nonEmpty())),
	enabled: v.optional(v.boolean(), true),
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 1.0),
	diffuse: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	specular: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),
	colorTemperature: v.optional(v.pipe(v.number(), v.minValue(1000), v.maxValue(15_000))),
	falloffType: v.optional(LightFalloffTypeSchema, 'default'),
	intensityMode: v.optional(LightIntensityModeSchema, 'automatic'),

	// --- HemisphericLight-specific fields ---
	/** Sky direction. Default: upward (0, 1, 0). */
	direction: v.optional(Vector3Schema, { x: 0, y: 1, z: 0 }),
	/** Ground (bounce) color. Default: dim gray (0.2, 0.2, 0.2). */
	groundColor: v.optional(ColorRgbaSchema, { r: 0.2, g: 0.2, b: 0.2, a: 1 }),
});

/** Inferred HemisphericLight config type from {@link HemisphericLightConfigSchema}. */
export type HemisphericLightConfig = v.InferOutput<typeof HemisphericLightConfigSchema>;

/**
 * Discriminated union of all light types.
 *
 * Uses `v.variant('type', [...])` to discriminate on the `type` field.
 * Valid types: `'point'`, `'spot'`, `'directional'`, `'hemispheric'`.
 */
export const LightConfigSchema = v.variant('type', [
	PointLightConfigSchema,
	SpotLightConfigSchema,
	DirectionalLightConfigSchema,
	HemisphericLightConfigSchema,
]);

/** Inferred light config union type from {@link LightConfigSchema}. */
export type LightConfig = v.InferOutput<typeof LightConfigSchema>;

// =============================================================================
// Day/Night Cycle Schemas
// =============================================================================

/**
 * Time keyframe for day/night cycle interpolation.
 *
 * Each keyframe specifies visual properties at a given hour of day.
 * The day/night engine lerps between adjacent keyframes.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { TimeKeyframeSchema } from './lighting-config';
 *
 * const result = safeParse(TimeKeyframeSchema, {
 *   time: 12, sunIntensity: 1.0,
 *   clearColor: { r: 0.35, g: 0.5, b: 0.8 },
 * });
 * ```
 */
export const TimeKeyframeSchema = v.strictObject({
	/** Hour of day [0, 24]. Required. */
	time: v.pipe(v.number(), v.minValue(0), v.maxValue(24)),

	/** Ambient light diffuse color at this time. */
	ambientColor: v.optional(ColorRgbaSchema),
	/** Ambient light ground color at this time. */
	ambientGroundColor: v.optional(ColorRgbaSchema),
	/** Sun light diffuse color at this time. */
	sunColor: v.optional(ColorRgbaSchema),
	/** Sun light intensity [0, 10]. */
	sunIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10))),
	/** Moon light color at this time. */
	moonColor: v.optional(ColorRgbaSchema),
	/** Moon light intensity [0, 10]. */
	moonIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10))),
	/** Scene background color at this time. */
	clearColor: v.optional(ColorRgbaSchema),
	/** Fog color at this time. */
	fogColor: v.optional(ColorRgbaSchema),
	/** Fog density [0, 1]. */
	fogDensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1))),
	/** HDR environment intensity [0, 5]. */
	environmentIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5))),

	/** Auto-exposure shift [0, 4]. */
	exposure: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(4))),
	/** Bloom weight shift [0, 2]. */
	bloomWeight: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2))),
	/** Contrast shift [0, 2]. */
	contrast: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2))),

	/** Primary sky color at this time (used for color-mode sky and clearColor). */
	skyColor: v.optional(ColorRgbaSchema),
	/** Top gradient color at this time (for gradient sky mode). */
	skyGradientTop: v.optional(ColorRgbaSchema),
	/** Bottom gradient color at this time (for gradient sky mode). */
	skyGradientBottom: v.optional(ColorRgbaSchema),
	/** When true, fog color auto-follows sky horizon color. */
	fogSyncSky: v.optional(v.boolean()),
});

/** Inferred time keyframe type from {@link TimeKeyframeSchema}. */
export type TimeKeyframe = v.InferOutput<typeof TimeKeyframeSchema>;

/**
 * Sun path configuration.
 *
 * Controls procedural sun direction computation from time of day:
 * sunrise/sunset hours, peak elevation angle, and starting azimuth.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SunPathConfigSchema } from './lighting-config';
 *
 * const result = safeParse(SunPathConfigSchema, {
 *   sunrise: 5, sunset: 19, maxElevation: 80,
 * });
 * ```
 */
export const SunPathConfigSchema = v.strictObject({
	/** Hour of sunrise [0, 24]. Default: 6. */
	sunrise: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24)), 6),
	/** Hour of sunset [0, 24]. Default: 18. */
	sunset: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24)), 18),
	/** Peak sun elevation angle in degrees [0, 90]. Default: 75. */
	maxElevation: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(90)), 75),
	/** Starting azimuth in degrees [0, 360] (90 = east). Default: 90. */
	azimuthStart: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 90),
});

/** Inferred sun path config type from {@link SunPathConfigSchema}. */
export type SunPathConfig = v.InferOutput<typeof SunPathConfigSchema>;

/** Season preset affecting sun path parameters. */
export const SeasonSchema = v.picklist(['spring', 'summer', 'autumn', 'winter']);

/** Inferred season type from {@link SeasonSchema}. */
export type Season = v.InferOutput<typeof SeasonSchema>;

/** Moon phase [0=new, 4=full, 7=waning crescent]. */
export const MoonPhaseSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(7));

/** Indoor/outdoor mode controlling cycle visual application. */
export const IndoorModeSchema = v.picklist(['outdoor', 'indoor', 'cave']);

/** Inferred indoor mode type from {@link IndoorModeSchema}. */
export type IndoorMode = v.InferOutput<typeof IndoorModeSchema>;

/** Transition easing for keyframe interpolation. */
export const TransitionEasingSchema = v.picklist(['linear', 'smooth', 'easeIn', 'easeOut']);

/** Inferred transition easing type from {@link TransitionEasingSchema}. */
export type TransitionEasing = v.InferOutput<typeof TransitionEasingSchema>;

/** Time-of-day phase names (auto-computed from sun path). */
export const TimePhaseSchema = v.picklist([
	'dawn',
	'morning',
	'noon',
	'afternoon',
	'dusk',
	'twilight',
	'night',
	'midnight',
]);

/** Inferred time phase type from {@link TimePhaseSchema}. */
export type TimePhase = v.InferOutput<typeof TimePhaseSchema>;

/**
 * Day/night cycle configuration.
 *
 * References lights by `id` from the lights array (data-driven).
 * Sun direction is procedural from time via SunPathConfig.
 * Keyframe interpolation drives ambient, sun, moon, fog, and environment.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { DayNightCycleConfigSchema } from './lighting-config';
 *
 * const result = safeParse(DayNightCycleConfigSchema, {
 *   enabled: true, timeOfDay: 10, speed: 0.5,
 *   sunLightId: 'sun', ambientLightId: 'ambient',
 *   sunPath: { sunrise: 6, sunset: 18 },
 * });
 * ```
 */
export const DayNightCycleConfigSchema = v.strictObject({
	/** Whether the cycle is active. Default: false. */
	enabled: v.optional(v.boolean(), false),
	/** Initial time of day [0, 24]. Default: 12 (noon). */
	timeOfDay: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24)), 12),
	/** Game-hours per real second [0, 100]. 0 = paused. Default: 0. */
	speed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 0),
	/** DirectionalLight id for sun. */
	sunLightId: v.optional(v.string()),
	/** HemisphericLight id for ambient. */
	ambientLightId: v.optional(v.string()),
	/** Light id for moon. */
	moonLightId: v.optional(v.string()),
	/** Sun path computation parameters. */
	sunPath: v.optional(SunPathConfigSchema),
	/** Keyframes for interpolation (min 2). Omit for default 9-keyframe cycle. */
	keyframes: v.optional(v.pipe(v.array(TimeKeyframeSchema), v.minLength(2))),
	/** Season preset. Default: summer. */
	season: v.optional(SeasonSchema, 'summer'),
	/** Moon phase [0–7]. Default: 4 (full moon). */
	moonPhase: v.optional(MoonPhaseSchema, 4),
	/** Indoor/outdoor mode. Default: outdoor. */
	indoorMode: v.optional(IndoorModeSchema, 'outdoor'),
	/** Keyframe interpolation easing. Default: linear. */
	transitionEasing: v.optional(TransitionEasingSchema, 'linear'),
});

/** Inferred day/night cycle config type from {@link DayNightCycleConfigSchema}. */
export type DayNightCycleConfig = v.InferOutput<typeof DayNightCycleConfigSchema>;

// =============================================================================
// Glow Layer Schema
// =============================================================================

/**
 * Glow layer configuration.
 *
 * Global GlowLayer effect (separate from bloom post-process).
 * Used for magical effects, torch glow, and emissive highlights.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { GlowLayerConfigSchema } from './lighting-config';
 *
 * const result = safeParse(GlowLayerConfigSchema, {
 *   enabled: true, intensity: 0.3, blurKernelSize: 32,
 * });
 * ```
 */
export const GlowLayerConfigSchema = v.strictObject({
	/** Whether glow is enabled. Default: false. */
	enabled: v.optional(v.boolean(), false),
	/** Glow intensity [0, 5]. Default: 0.5. */
	intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 0.5),
	/** Blur kernel size [1, 256]. Default: 32. */
	blurKernelSize: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(256)), 32),
	/** Glow render target resolution ratio (0, 1]. Default: 0.5. */
	mainTextureRatio: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(1)), 0.5),
});

/** Inferred glow layer config type from {@link GlowLayerConfigSchema}. */
export type GlowLayerConfig = v.InferOutput<typeof GlowLayerConfigSchema>;

// =============================================================================
// Top-Level Lighting Config
// =============================================================================

/**
 * Top-level lighting configuration for a map.
 *
 * Added as `lighting` field on `MapData`. Contains the lights array,
 * optional day/night cycle, and optional glow layer.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { LightingConfigSchema } from './lighting-config';
 *
 * const result = safeParse(LightingConfigSchema, {
 *   lights: [
 *     { id: 'ambient', type: 'hemispheric', intensity: 0.6 },
 *     { id: 'sun', type: 'directional', shadow: { enabled: true } },
 *   ],
 *   dayNight: { enabled: true, speed: 0.5, sunLightId: 'sun' },
 *   glow: { enabled: true, intensity: 0.3 },
 * });
 * ```
 */
export const LightingConfigSchema = v.pipe(
	v.strictObject({
		/** Array of light configurations. Default: empty. */
		lights: v.optional(v.array(LightConfigSchema), []),
		/** Day/night cycle configuration. */
		dayNight: v.optional(DayNightCycleConfigSchema),
		/** Glow layer configuration. */
		glow: v.optional(GlowLayerConfigSchema),
	}),
	v.readonly(),
);

/** Inferred top-level lighting config type from {@link LightingConfigSchema}. */
export type LightingConfig = v.InferOutput<typeof LightingConfigSchema>;
