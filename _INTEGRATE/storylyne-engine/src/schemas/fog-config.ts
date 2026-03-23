/**
 * Fog configuration schemas.
 *
 * Defines all 12 fog sub-schemas covering 77+ configurable options:
 * enhanced core, height fog, second layer, inscattering, atmospheric,
 * noise, wind, overlays, animation, presets, day/night, and per-mesh.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { FogConfigSchema, type FogConfig } from './fog-config';
 *
 * const result = safeParse(FogConfigSchema, {
 *   mode: 'exponential',
 *   density: 0.02,
 *   heightFog: { enabled: true, baseHeight: 0, falloff: 0.5 },
 * });
 * if (result.ok) result.data.heightFog?.enabled; // true
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ColorRgbaSchema } from './color-schema';

// =============================================================================
// Fog Mode
// =============================================================================

/**
 * Fog mode picklist.
 *
 * Maps to Babylon.js `FOGMODE_NONE`, `FOGMODE_LINEAR`, `FOGMODE_EXP`, `FOGMODE_EXP2`.
 */
export const FogModeSchema = v.picklist(['none', 'linear', 'exponential', 'exponential2']);

/** Inferred fog mode type. */
export type FogMode = v.InferOutput<typeof FogModeSchema>;

// =============================================================================
// Group 2: Height Fog
// =============================================================================

/**
 * Height fog configuration.
 *
 * Vertical density gradient — denser near the ground, thinner at altitude.
 * Uses the Inigo Quilez analytical height fog formula in the GLSL shader.
 *
 * @example
 * ```typescript
 * const result = safeParse(HeightFogSchema, {
 *   enabled: true, baseHeight: 0, falloff: 0.5, density: 0.1,
 * });
 * ```
 */
export const HeightFogSchema = v.strictObject({
  /** Enable height-based density. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Reference altitude — fog is densest below this. Default: 0. */
  baseHeight: v.optional(v.number(), 0),

  /** Density decrease rate with altitude [0.01, 10]. Default: 0.5. */
  falloff: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(10)), 0.5),

  /** Base density at reference height [0, 1]. Default: 0.1. */
  density: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.1),

  /** Vertical offset. Default: 0. */
  offset: v.optional(v.number(), 0),
});

/** Inferred height fog type. */
export type HeightFog = v.InferOutput<typeof HeightFogSchema>;

// =============================================================================
// Group 3: Second Fog Layer
// =============================================================================

/**
 * Second fog layer configuration (Unreal-style dual fog).
 *
 * Independent second fog layer at a different altitude.
 *
 * @example
 * ```typescript
 * const result = safeParse(SecondFogLayerSchema, {
 *   enabled: true, density: 0.08, heightFalloff: 0.3,
 * });
 * ```
 */
export const SecondFogLayerSchema = v.strictObject({
  /** Enable second layer. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Second layer density [0, 1]. Default: 0.05. */
  density: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.05),

  /** Height falloff [0.01, 10]. Default: 0.2. */
  heightFalloff: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(10)), 0.2),

  /** Height offset from base. Default: 0. */
  heightOffset: v.optional(v.number(), 0),

  /** Second layer color. Default: light blue-gray. */
  color: v.optional(ColorRgbaSchema, { r: 0.7, g: 0.75, b: 0.8, a: 1 }),
});

/** Inferred second fog layer type. */
export type SecondFogLayer = v.InferOutput<typeof SecondFogLayerSchema>;

// =============================================================================
// Group 4: Directional Inscattering
// =============================================================================

/**
 * Directional inscattering configuration.
 *
 * Sun glow effect when looking toward a light source through fog.
 *
 * @example
 * ```typescript
 * const result = safeParse(InscatteringSchema, {
 *   enabled: true, exponent: 8, intensity: 1.5,
 * });
 * ```
 */
export const InscatteringSchema = v.strictObject({
  /** Enable inscattering. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Glow color. Default: warm orange. */
  color: v.optional(ColorRgbaSchema, { r: 1, g: 0.9, b: 0.7, a: 1 }),

  /** Cone tightness [1, 32]. Default: 4. */
  exponent: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(32)), 4),

  /** Effect start distance [0, ...]. Default: 50. */
  startDistance: v.optional(v.pipe(v.number(), v.minValue(0)), 50),

  /** Brightness multiplier [0, 5]. Default: 1. */
  intensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 1),
});

/** Inferred inscattering type. */
export type Inscattering = v.InferOutput<typeof InscatteringSchema>;

// =============================================================================
// Group 5: Atmospheric Scattering
// =============================================================================

/**
 * Atmospheric scattering configuration.
 *
 * Per-channel extinction/inscattering for physically-based color shifts.
 *
 * @example
 * ```typescript
 * const result = safeParse(AtmosphericSchema, {
 *   enabled: true, extinctionR: 0.01, extinctionG: 0.02, extinctionB: 0.04,
 * });
 * ```
 */
export const AtmosphericSchema = v.strictObject({
  /** Enable atmospheric mode. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Red extinction [0, 0.5]. Default: 0.02. */
  extinctionR: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.02),

  /** Green extinction [0, 0.5]. Default: 0.03. */
  extinctionG: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.03),

  /** Blue extinction [0, 0.5]. Default: 0.05. */
  extinctionB: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.05),

  /** Red inscattering [0, 0.5]. Default: 0.04. */
  inscatteringR: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.04),

  /** Green inscattering [0, 0.5]. Default: 0.04. */
  inscatteringG: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.04),

  /** Blue inscattering [0, 0.5]. Default: 0.06. */
  inscatteringB: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.06),
});

/** Inferred atmospheric type. */
export type Atmospheric = v.InferOutput<typeof AtmosphericSchema>;

// =============================================================================
// Group 6: Noise-Based Density
// =============================================================================

/**
 * Noise-based density variation configuration.
 *
 * Procedural noise modulates fog density for organic, non-uniform appearance.
 * Uses FBM (fractal Brownian motion) in the GLSL shader.
 *
 * @example
 * ```typescript
 * const result = safeParse(FogNoiseSchema, {
 *   enabled: true, scale: 2.0, octaves: 4,
 * });
 * ```
 */
export const FogNoiseSchema = v.strictObject({
  /** Enable noise modulation. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Spatial frequency [0.001, 10]. Default: 1.0. */
  scale: v.optional(v.pipe(v.number(), v.minValue(0.001), v.maxValue(10)), 1.0),

  /** Density modulation strength [0, 1]. Default: 0.5. */
  amplitude: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),

  /** Temporal morphing speed [0, 2]. Default: 0.1. */
  speed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 0.1),

  /** FBM octave count [1, 6]. Default: 3. */
  octaves: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(6)), 3),

  /** Frequency multiplier per octave [1, 4]. Default: 2.0. */
  lacunarity: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(4)), 2.0),

  /** Amplitude multiplier per octave [0.1, 0.9]. Default: 0.5. */
  persistence: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(0.9)), 0.5),
});

/** Inferred fog noise type. */
export type FogNoise = v.InferOutput<typeof FogNoiseSchema>;

// =============================================================================
// Group 7: Wind
// =============================================================================

/**
 * Wind / fog movement configuration.
 *
 * Shifts noise sampling position over time for directional fog drift.
 *
 * @example
 * ```typescript
 * const result = safeParse(FogWindSchema, {
 *   enabled: true, directionAngle: 45, speed: 1.0,
 * });
 * ```
 */
export const FogWindSchema = v.strictObject({
  /** Enable wind. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Wind direction in degrees [0, 360]. Default: 0. */
  directionAngle: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 0),

  /** Wind speed multiplier [0, 5]. Default: 0.5. */
  speed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 0.5),

  /** Random perturbation intensity [0, 1]. Default: 0.2. */
  turbulence: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.2),
});

/** Inferred fog wind type. */
export type FogWind = v.InferOutput<typeof FogWindSchema>;

// =============================================================================
// Group 8: Overlay Enums
// =============================================================================

/** Built-in procedural overlay texture names. */
export const FogOverlayTextureSchema = v.picklist(['perlin', 'worley', 'clouds', 'wisps', 'smoke']);

/** Inferred overlay texture type. */
export type FogOverlayTexture = v.InferOutput<typeof FogOverlayTextureSchema>;

/** Overlay blend mode. */
export const FogOverlayBlendModeSchema = v.picklist(['normal', 'additive', 'multiply', 'screen']);

/** Inferred blend mode type. */
export type FogOverlayBlendMode = v.InferOutput<typeof FogOverlayBlendModeSchema>;

/** Overlay vignette mask type. */
export const FogOverlayVignetteSchema = v.picklist([
  'none',
  'radial',
  'border',
  'horizontal',
  'vertical',
  'upper',
  'lower',
  'left',
  'right',
]);

/** Inferred vignette type. */
export type FogOverlayVignette = v.InferOutput<typeof FogOverlayVignetteSchema>;

// =============================================================================
// Group 8: Fog Overlay
// =============================================================================

/**
 * Single fog overlay layer configuration (RPG Maker-style).
 *
 * Scrolling texture layer with blend mode, tint, hue animation, and vignette.
 *
 * @example
 * ```typescript
 * const result = safeParse(FogOverlaySchema, {
 *   enabled: true, texture: 'clouds', opacity: 0.4, blendMode: 'additive',
 * });
 * ```
 */
export const FogOverlaySchema = v.strictObject({
  /** Enable this overlay layer. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Texture name (built-in) or custom path. Default: 'perlin'. */
  texture: v.optional(FogOverlayTextureSchema, 'perlin'),

  /** Layer opacity [0, 1]. Default: 0.3. */
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.3),

  /** Compositing blend mode. Default: 'additive'. */
  blendMode: v.optional(FogOverlayBlendModeSchema, 'additive'),

  /** Horizontal scroll speed. Default: 0.5. */
  scrollX: v.optional(v.number(), 0.5),

  /** Vertical scroll speed. Default: 0. */
  scrollY: v.optional(v.number(), 0),

  /** Texture tiling scale [0.1, 10]. Default: 1.0. */
  scale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1.0),

  /** Color tint. Default: white. */
  tint: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),

  /** Hue shift [0, 360] degrees. Default: 0. */
  hue: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(360)), 0),

  /** Animated hue rotation per second. Default: 0. */
  hueSpeed: v.optional(v.number(), 0),

  /** Scroll with map instead of camera. Default: false. */
  mapLocked: v.optional(v.boolean(), false),

  /** Vignette mask type. Default: 'none'. */
  vignette: v.optional(FogOverlayVignetteSchema, 'none'),

  /** Vignette mask strength [0, 1]. Default: 0.5. */
  vignetteIntensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.5),
});

/** Inferred fog overlay type. */
export type FogOverlay = v.InferOutput<typeof FogOverlaySchema>;

// =============================================================================
// Group 9: Animation Enums
// =============================================================================

/** Animation waveform type. */
export const FogAnimationWaveformSchema = v.picklist(['sine', 'triangle', 'sawtooth']);

/** Inferred waveform type. */
export type FogAnimationWaveform = v.InferOutput<typeof FogAnimationWaveformSchema>;

// =============================================================================
// Group 9: Animated Density
// =============================================================================

/**
 * Animated density (breathing/pulsing) configuration.
 *
 * Oscillates fog density over time for atmospheric effects.
 *
 * @example
 * ```typescript
 * const result = safeParse(FogAnimationSchema, {
 *   enabled: true, speed: 0.3, waveform: 'triangle',
 * });
 * ```
 */
export const FogAnimationSchema = v.strictObject({
  /** Enable density animation. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Oscillation speed [0.01, 5]. Default: 0.5. */
  speed: v.optional(v.pipe(v.number(), v.minValue(0.01), v.maxValue(5)), 0.5),

  /** Density variation range [0, 0.5]. Default: 0.3. */
  amplitude: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.3),

  /** Waveform shape. Default: 'sine'. */
  waveform: v.optional(FogAnimationWaveformSchema, 'sine'),
});

/** Inferred fog animation type. */
export type FogAnimation = v.InferOutput<typeof FogAnimationSchema>;

// =============================================================================
// Group 10: Presets
// =============================================================================

/**
 * Fog preset name picklist.
 *
 * 14 curated presets covering common RPG/game environments.
 */
export const FogPresetSchema = v.picklist([
  'clear',
  'lightMist',
  'morningFog',
  'denseFog',
  'dungeon',
  'underwater',
  'forest',
  'mountain',
  'sandstorm',
  'snowstorm',
  'dream',
  'volcanic',
  'swamp',
  'nightMist',
]);

/** Inferred fog preset type. */
export type FogPreset = v.InferOutput<typeof FogPresetSchema>;

// =============================================================================
// Group 11: Day/Night Integration
// =============================================================================

/**
 * Day/night fog integration configuration.
 *
 * Animates fog color and density with the existing day/night cycle system.
 *
 * @example
 * ```typescript
 * const result = safeParse(FogDayNightSchema, {
 *   enabled: true,
 *   dayColor: { r: 0.9, g: 0.9, b: 0.95 },
 *   nightColor: { r: 0.05, g: 0.05, b: 0.1 },
 * });
 * ```
 */
export const FogDayNightSchema = v.strictObject({
  /** Enable day/night fog integration. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Fog color during day. Default: light blue-gray. */
  dayColor: v.optional(ColorRgbaSchema, { r: 0.8, g: 0.85, b: 0.9, a: 1 }),

  /** Fog color at night. Default: dark blue. */
  nightColor: v.optional(ColorRgbaSchema, { r: 0.1, g: 0.1, b: 0.2, a: 1 }),

  /** Fog color at dawn/dusk. Default: warm orange. */
  dawnColor: v.optional(ColorRgbaSchema, { r: 0.9, g: 0.7, b: 0.5, a: 1 }),

  /** Density during day [0, 0.1]. Default: 0.005. */
  dayDensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.1)), 0.005),

  /** Density at night [0, 0.1]. Default: 0.02. */
  nightDensity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.1)), 0.02),
});

/** Inferred fog day/night type. */
export type FogDayNight = v.InferOutput<typeof FogDayNightSchema>;

// =============================================================================
// Group 12: Per-Mesh Control
// =============================================================================

/**
 * Per-mesh fog exclusion configuration.
 *
 * Controls which mesh categories are excluded from fog rendering.
 *
 * @example
 * ```typescript
 * const result = safeParse(FogPerMeshSchema, {
 *   excludeGround: true, excludeSprites: false,
 * });
 * ```
 */
export const FogPerMeshSchema = v.strictObject({
  /** Exclude ground/tilemap meshes from fog. Default: false. */
  excludeGround: v.optional(v.boolean(), false),

  /** Exclude billboard sprites from fog. Default: false. */
  excludeSprites: v.optional(v.boolean(), false),
});

/** Inferred fog per-mesh type. */
export type FogPerMesh = v.InferOutput<typeof FogPerMeshSchema>;

// =============================================================================
// Full Fog Config Schema
// =============================================================================

/**
 * Complete fog configuration schema.
 *
 * Extends the original 5-property fog (mode, color, density, start, end)
 * with 72 additional options across 12 feature groups:
 * enhanced core, height fog, second layer, inscattering, atmospheric,
 * noise, wind, overlays, animation, presets, day/night, and per-mesh.
 *
 * Fully backward compatible — omitting all new fields produces identical
 * behavior to the original `FogConfigSchema`.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { FogConfigSchema, type FogConfig } from './fog-config';
 *
 * // Backward compatible — original 5 fields only
 * const basic = safeParse(FogConfigSchema, { mode: 'linear', start: 20, end: 100 });
 *
 * // Full — all features enabled
 * const full = safeParse(FogConfigSchema, {
 *   mode: 'exponential',
 *   density: 0.02,
 *   maxOpacity: 0.8,
 *   heightFog: { enabled: true, baseHeight: 0, falloff: 0.5 },
 *   noise: { enabled: true, octaves: 4 },
 *   overlays: [{ enabled: true, texture: 'clouds', blendMode: 'additive' }],
 * });
 * ```
 */
export const FogConfigSchema = v.strictObject({
  // =========================================================================
  // Original 5 fields (backward compatible)
  // =========================================================================

  /**
   * Fog mode.
   *
   * - `'none'` — no fog (FOGMODE_NONE = 0).
   * - `'linear'` — linear distance fog (FOGMODE_LINEAR = 3).
   * - `'exponential'` — exponential density fog (FOGMODE_EXP = 1).
   * - `'exponential2'` — squared exponential density fog (FOGMODE_EXP2 = 2).
   */
  mode: v.optional(FogModeSchema, 'none'),

  /** Fog color. Default: light gray-blue (0.8, 0.8, 0.85). */
  color: v.optional(ColorRgbaSchema, { r: 0.8, g: 0.8, b: 0.85, a: 1 }),

  /** Exponential fog density [0, ...]. Default: 0.01. */
  density: v.optional(v.pipe(v.number(), v.minValue(0)), 0.01),

  /** Linear fog start distance. Default: 50. */
  start: v.optional(v.number(), 50),

  /** Linear fog end distance. Default: 300. */
  end: v.optional(v.number(), 300),

  // =========================================================================
  // Group 1: Enhanced Core Parameters
  // =========================================================================

  /** Maximum fog opacity [0, 1]. Clamps fog to prevent full obscuration. Default: 1. */
  maxOpacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),

  /** Distance from camera where fog begins [0, ...]. Default: 0. */
  startDistance: v.optional(v.pipe(v.number(), v.minValue(0)), 0),

  /** Distance beyond which fog is not applied [0, ...] (0 = disabled). Default: 0. */
  cutoffDistance: v.optional(v.pipe(v.number(), v.minValue(0)), 0),

  /** Prevent fog from affecting skybox. Default: true. */
  excludeSkybox: v.optional(v.boolean(), true),

  /** How much fog obscures the sky [0, 1] (0 = none, 1 = fully). Default: 0. */
  skyAffect: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0),

  // =========================================================================
  // Groups 2-12: Optional sub-objects
  // =========================================================================

  /** Height fog configuration. */
  heightFog: v.optional(HeightFogSchema),

  /** Second fog layer (Unreal-style dual fog). */
  secondLayer: v.optional(SecondFogLayerSchema),

  /** Directional inscattering (sun glow). */
  inscattering: v.optional(InscatteringSchema),

  /** Atmospheric scattering (per-channel extinction). */
  atmospheric: v.optional(AtmosphericSchema),

  /** Noise-based density variation. */
  noise: v.optional(FogNoiseSchema),

  /** Wind / fog movement. */
  wind: v.optional(FogWindSchema),

  /** Scrolling fog overlay layers (up to 4). */
  overlays: v.optional(v.array(FogOverlaySchema), []),

  /** Animated density (breathing/pulsing). */
  animation: v.optional(FogAnimationSchema),

  /** Named preset (populates other fields with curated defaults). */
  preset: v.optional(FogPresetSchema),

  /** Day/night fog integration. */
  dayNight: v.optional(FogDayNightSchema),

  /** Per-mesh fog exclusion. */
  perMesh: v.optional(FogPerMeshSchema),
});

/** Inferred full fog configuration type. */
export type FogConfig = v.InferOutput<typeof FogConfigSchema>;
