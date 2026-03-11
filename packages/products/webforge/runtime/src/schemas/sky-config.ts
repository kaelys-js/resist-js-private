/**
 * Sky and parallax background configuration schema.
 *
 * Defines the sky rendering system for the WebForge runtime:
 *
 * | Type | Description |
 * |------|-------------|
 * | `color` | Solid background color (default — light blue) |
 * | `gradient` | Vertical color gradient with stop positions |
 * | `skybox` | 6-face cubemap skybox |
 * | `procedural` | Atmosphere simulation via turbidity/rayleigh/luminance |
 *
 * Parallax layers are ordered back-to-front and scroll relative to
 * camera movement, creating a depth parallax effect behind the tilemap.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SkyConfigSchema, type SkyConfig } from './sky-config';
 *
 * // Default solid color sky
 * const sky = safeParse(SkyConfigSchema, {});
 *
 * // Gradient sunset sky with parallax mountains
 * const sunset = safeParse(SkyConfigSchema, {
 *   type: 'gradient',
 *   gradient: [
 *     { position: 0, color: { r: 0.1, g: 0.1, b: 0.3 } },
 *     { position: 1, color: { r: 0.8, g: 0.4, b: 0.2 } },
 *   ],
 *   parallaxLayers: [
 *     { imagePath: 'bg/mountains.png', scrollSpeedX: 0.2 },
 *   ],
 * });
 * ```
 *
 * @module
 */

import * as v from 'valibot';

import { ColorRgbaSchema } from './color-schema';

// =============================================================================
// Sky Type
// =============================================================================

/**
 * Sky rendering type.
 *
 * Determines how the background behind the tilemap is rendered.
 */
export const SkyTypeSchema = v.picklist([
  'color',
  'gradient',
  'skybox',
  'procedural',
  'panorama',
  'hdri',
]);

/** Inferred sky type from {@link SkyTypeSchema}. */
export type SkyType = v.InferOutput<typeof SkyTypeSchema>;

// =============================================================================
// Sky Gradient Stop
// =============================================================================

/**
 * A single color stop in a vertical sky gradient.
 *
 * Position 0 = top of the viewport, 1 = bottom.
 */
export const SkyGradientStopSchema = v.strictObject({
  /** Vertical position of the stop (0 = top, 1 = bottom). */
  position: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  /** Color at this gradient stop. */
  color: ColorRgbaSchema,
});

/** Inferred gradient stop type from {@link SkyGradientStopSchema}. */
export type SkyGradientStop = v.InferOutput<typeof SkyGradientStopSchema>;

// =============================================================================
// Blend Mode
// =============================================================================

/**
 * Alpha blending mode for parallax layers.
 *
 * Maps to `BABYLON.Constants.ALPHA_*` blending constants.
 */
export const BlendModeSchema = v.picklist([
  'alpha',
  'additive',
  'multiply',
  'subtract',
  'screen',
  'maximized',
  'oneone',
  'premultiplied',
]);

/** Inferred blend mode type from {@link BlendModeSchema}. */
export type BlendMode = v.InferOutput<typeof BlendModeSchema>;

// =============================================================================
// Layer Type
// =============================================================================

/**
 * Rendering layer for parallax: background (behind tilemap) or foreground (above tilemap).
 */
export const ParallaxLayerTypeSchema = v.picklist(['background', 'foreground']);

/** Inferred layer type from {@link ParallaxLayerTypeSchema}. */
export type ParallaxLayerType = v.InferOutput<typeof ParallaxLayerTypeSchema>;

// =============================================================================
// Stars Config
// =============================================================================

/**
 * Star field configuration for nighttime sky.
 *
 * Rendered as a background Layer with time-based opacity fade and twinkle.
 * Stars fade in at `fadeInTime` (default: sunset) and out at `fadeOutTime`
 * (default: sunrise), with a small sine-based twinkle oscillation.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { StarsConfigSchema } from './sky-config';
 *
 * const result = safeParse(StarsConfigSchema, {
 *   enabled: true,
 *   texture: 'sky/stars.png',
 *   opacity: 0.8,
 *   twinkleSpeed: 1.5,
 * });
 * ```
 */
export const StarsConfigSchema = v.strictObject({
  /** Enable star field layer. Default: false. */
  enabled: v.optional(v.boolean(), false),

  /** Path to star texture (relative to project assets directory). */
  texture: v.optional(v.pipe(v.string(), v.minLength(1)), 'sky/stars.png'),

  /** Max opacity when fully visible [0, 1]. Default: 0.8. */
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.8),

  /** Twinkle oscillation speed [0, 5]. Default: 1. */
  twinkleSpeed: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(5)), 1),

  /** Hour when stars begin fading in [0, 24]. Default: 18 (sunset). */
  fadeInTime: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24)), 18),

  /** Hour when stars finish fading out [0, 24]. Default: 6 (sunrise). */
  fadeOutTime: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(24)), 6),

  /** Texture scale [0.1, 10]. Default: 2. */
  scale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 2),
});

/** Inferred stars config type from {@link StarsConfigSchema}. */
export type StarsConfig = v.InferOutput<typeof StarsConfigSchema>;

// =============================================================================
// Parallax Layer
// =============================================================================

/**
 * A single parallax scrolling background layer.
 *
 * Layers are rendered as textured planes behind the tilemap and
 * scroll at a fraction of the camera movement speed to create
 * a depth parallax effect.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { ParallaxLayerSchema } from './sky-config';
 *
 * const layer = safeParse(ParallaxLayerSchema, {
 *   imagePath: 'backgrounds/mountains.png',
 *   scrollSpeedX: 0.3,
 *   opacity: 0.8,
 * });
 * ```
 */
export const ParallaxLayerSchema = v.strictObject({
  /** Path to the background image (relative to project assets directory). */
  imagePath: v.pipe(v.string(), v.minLength(1)),

  /** Horizontal scroll speed relative to camera movement. Default: 0.5. */
  scrollSpeedX: v.optional(v.number(), 0.5),

  /** Vertical scroll speed relative to camera movement. Default: 0. */
  scrollSpeedY: v.optional(v.number(), 0),

  /** Vertical offset in world units. Default: 0. */
  offsetY: v.optional(v.number(), 0),

  /** Layer opacity (0 = fully transparent, 1 = fully opaque). Default: 1. */
  opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 1),

  /** Whether the image repeats horizontally. Default: true. */
  tileX: v.optional(v.boolean(), true),

  /** Whether the image repeats vertically. Default: false. */
  tileY: v.optional(v.boolean(), false),

  /** Image scale multiplier (0.1–10). Default: 1. */
  scale: v.optional(v.pipe(v.number(), v.minValue(0.1), v.maxValue(10)), 1),

  /** Constant horizontal drift in UV/sec (camera-independent). Default: 0. */
  autoScrollX: v.optional(v.number(), 0),

  /** Constant vertical drift in UV/sec (camera-independent). Default: 0. */
  autoScrollY: v.optional(v.number(), 0),

  /** Rendering layer: behind tilemap or above tilemap. Default: 'background'. */
  layerType: v.optional(ParallaxLayerTypeSchema, 'background'),

  /** Alpha blending mode. Default: 'alpha'. */
  blendMode: v.optional(BlendModeSchema, 'alpha'),

  /** Color tint multiplied with texture. Default: white (no tint). */
  tint: v.optional(ColorRgbaSchema, { r: 1, g: 1, b: 1, a: 1 }),

  /** Sort order (lower = further back). Default: 0. */
  depth: v.optional(v.number(), 0),
});

/** Inferred parallax layer type from {@link ParallaxLayerSchema}. */
export type ParallaxLayer = v.InferOutput<typeof ParallaxLayerSchema>;

// =============================================================================
// Sky Config
// =============================================================================

/**
 * Sky and parallax background configuration schema.
 *
 * Controls the background rendered behind the tilemap: solid color,
 * vertical gradient, cubemap skybox, or procedural atmosphere.
 * Optionally includes parallax scrolling layers for depth.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { SkyConfigSchema } from './sky-config';
 *
 * const result = safeParse(SkyConfigSchema, {
 *   type: 'skybox',
 *   skyboxPath: 'skyboxes/sunset',
 *   parallaxLayers: [
 *     { imagePath: 'bg/clouds.png', scrollSpeedX: 0.3 },
 *   ],
 * });
 * ```
 */
export const SkyConfigSchema = v.strictObject({
  /**
   * Sky rendering type.
   *
   * Default: `'color'` — solid background color.
   */
  type: v.optional(SkyTypeSchema, 'color'),

  /**
   * Background color for `'color'` type.
   *
   * Default: light blue `{r: 0.35, g: 0.5, b: 0.8, a: 1}`.
   */
  color: v.optional(ColorRgbaSchema, { r: 0.35, g: 0.5, b: 0.8, a: 1 }),

  /**
   * Gradient color stops for `'gradient'` type.
   *
   * Ordered top-to-bottom (position 0 → 1). At least 2 stops
   * recommended for a visible gradient.
   */
  gradient: v.optional(v.array(SkyGradientStopSchema)),

  /**
   * Cubemap texture path prefix for `'skybox'` type.
   *
   * Babylon.js expects 6 faces: `{path}_px.jpg`, `_nx.jpg`, etc.
   */
  skyboxPath: v.optional(v.string()),

  /** Skybox mesh size in world units. Must be ≥ 10. Default: 1000. */
  skyboxSize: v.optional(v.pipe(v.number(), v.minValue(10)), 1000),

  /**
   * Atmospheric turbidity for `'procedural'` type.
   *
   * Higher values = hazier sky. Range 0–20. Default: 10.
   */
  turbidity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(20)), 10),

  /**
   * Rayleigh scattering coefficient for `'procedural'` type.
   *
   * Controls blue-scatter intensity. Range 0–10. Default: 2.
   */
  rayleigh: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10)), 2),

  /**
   * Luminance for `'procedural'` type.
   *
   * Overall sky brightness. Range 0–2. Default: 1.
   */
  luminance: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2)), 1),

  /**
   * Mie scattering intensity for `'procedural'` type.
   *
   * Controls haze glow around the sun. Range 0–0.1. Default: 0.005.
   */
  mieCoefficient: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.1)), 0.005),

  /**
   * Mie directional parameter for `'procedural'` type.
   *
   * 0 = isotropic, 1 = fully forward scattering. Range 0–1. Default: 0.8.
   */
  mieDirectionalG: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.8),

  /**
   * Sun vertical angle for `'procedural'` type.
   *
   * 0 = horizon, 0.5 = zenith. Range 0–0.5. Default: 0.49.
   */
  inclination: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(0.5)), 0.49),

  /**
   * Sun horizontal angle for `'procedural'` type.
   *
   * Range 0–1 (maps to 0–2π). Default: 0.25.
   */
  azimuth: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(1)), 0.25),

  /**
   * Equirectangular panoramic image path for `'panorama'` type.
   *
   * Projected onto a skybox mesh as an equirectangular texture.
   */
  panoramaPath: v.optional(v.string()),

  /**
   * HDR environment texture path for `'hdri'` type.
   *
   * Loaded as an HDR cubemap for PBR reflections and sky rendering.
   */
  hdriPath: v.optional(v.string()),

  /**
   * Star field configuration for nighttime sky.
   *
   * When enabled, renders a background layer with twinkle and time-based opacity.
   */
  stars: v.optional(StarsConfigSchema),

  /**
   * Parallax scrolling background layers (ordered back-to-front).
   *
   * Empty array (default) means no parallax backgrounds.
   */
  parallaxLayers: v.optional(v.array(ParallaxLayerSchema), []),
});

/** Inferred sky configuration type from {@link SkyConfigSchema}. */
export type SkyConfig = v.InferOutput<typeof SkyConfigSchema>;
