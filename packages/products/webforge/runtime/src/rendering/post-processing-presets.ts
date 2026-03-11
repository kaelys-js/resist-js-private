/**
 * Post-processing preset definitions, quality scaling, and color grading.
 *
 * Provides 5 named presets (neutral, hd2d, cinematic, retro, fantasy),
 * a resolver that deep-merges per-map overrides on top of preset bases,
 * quality-based scaling that adjusts expensive effects, and color curve
 * builders for the color grading presets.
 *
 * @example
 * ```typescript
 * import { resolvePostProcessingConfig, applyQualityScaling } from './post-processing-presets';
 *
 * const resolved = resolvePostProcessingConfig({ preset: 'hd2d', bloom: { weight: 0.3 } });
 * if (!resolved.ok) return resolved;
 *
 * const scaled = applyQualityScaling(resolved.data, 'medium');
 * ```
 *
 * @module
 */

import * as BABYLON from '@babylonjs/core';

import { ERRORS, err, okUnchecked, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';

import {
  PostProcessingConfigSchema,
  type BloomConfig,
  type ChromaticAberrationConfig,
  type ColorGradingConfig,
  type ColorGradingPreset,
  type DepthOfFieldConfig,
  type DitheringConfig,
  type FxaaConfig,
  type GrainConfig,
  type HdrEnvironmentConfig,
  type PostProcessingConfig,
  type PostProcessingPresetName,
  type SharpenConfig,
  type SsaoConfig,
  type ToneMappingConfig,
  type VignetteConfig,
} from '../schemas/post-processing-config';
import type { QualityPreset } from '../schemas/quality-config';
import { okShallow, type BabylonResult } from '../core/babylon-result';

// =============================================================================
// Input Type (partial sub-schemas)
// =============================================================================

/**
 * Input type for {@link resolvePostProcessingConfig}.
 *
 * Unlike `PostProcessingConfig` where sub-schemas have all fields
 * (filled by Valibot defaults), this type allows partial sub-schemas
 * so callers can specify only the fields they want to override.
 */
export type PostProcessingConfigInput = {
  readonly enabled?: boolean;
  readonly preset?: PostProcessingPresetName;
  readonly bloom?: Partial<BloomConfig>;
  readonly depthOfField?: Partial<DepthOfFieldConfig>;
  readonly toneMapping?: Partial<ToneMappingConfig>;
  readonly colorGrading?: Partial<ColorGradingConfig>;
  readonly vignette?: Partial<VignetteConfig>;
  readonly grain?: Partial<GrainConfig>;
  readonly ssao?: Partial<SsaoConfig>;
  readonly chromaticAberration?: Partial<ChromaticAberrationConfig>;
  readonly sharpen?: Partial<SharpenConfig>;
  readonly fxaa?: Partial<FxaaConfig>;
  readonly dithering?: Partial<DitheringConfig>;
  readonly hdrEnvironment?: Partial<HdrEnvironmentConfig>;
  readonly exposure?: number;
  readonly contrast?: number;
};

// =============================================================================
// Preset Definitions
// =============================================================================

/** Neutral preset — all effects disabled, clean pass-through. */
const NEUTRAL_PRESET: PostProcessingConfig = {
  enabled: true,
  preset: 'neutral',
  bloom: { enabled: false, weight: 0.15, threshold: 0.9, kernel: 64, scale: 0.5 },
  depthOfField: {
    enabled: false,
    focalLength: 50,
    fStop: 2.8,
    focusDistance: 2000,
    blurLevel: 'medium',
  },
  toneMapping: { enabled: false, type: 'aces' },
  colorGrading: { enabled: false, preset: 'neutral' },
  vignette: {
    enabled: false,
    weight: 1.5,
    stretch: 0,
    color: { r: 0, g: 0, b: 0, a: 1 },
    blendMode: 'multiply',
  },
  grain: { enabled: false, intensity: 5, animated: true },
  ssao: {
    enabled: false,
    totalStrength: 1.0,
    radius: 2.0,
    samples: 16,
    base: 0.1,
    expensiveBlur: true,
  },
  chromaticAberration: { enabled: false, amount: 30, radialIntensity: 0.3 },
  sharpen: { enabled: false, edgeAmount: 0.3, colorAmount: 1.0 },
  fxaa: { enabled: false },
  dithering: { enabled: false, intensity: 0.004 },
  hdrEnvironment: { enabled: false, texturePath: '', intensity: 1.0, rotationY: 0 },
  exposure: 1.0,
  contrast: 1.0,
};

/** HD-2D preset — diorama tilt-shift look with warm bloom and atmosphere. */
const HD2D_PRESET: PostProcessingConfig = {
  enabled: true,
  preset: 'hd2d',
  bloom: { enabled: true, weight: 0.15, threshold: 0.85, kernel: 64, scale: 0.5 },
  depthOfField: {
    enabled: true,
    focalLength: 50,
    fStop: 2.8,
    focusDistance: 0,
    blurLevel: 'medium',
  },
  toneMapping: { enabled: true, type: 'aces' },
  colorGrading: { enabled: true, preset: 'warm' },
  vignette: {
    enabled: true,
    weight: 1.5,
    stretch: 5,
    color: { r: 0, g: 0, b: 0, a: 1 },
    blendMode: 'multiply',
  },
  grain: { enabled: true, intensity: 3, animated: true },
  ssao: {
    enabled: true,
    totalStrength: 1.0,
    radius: 2.0,
    samples: 16,
    base: 0.1,
    expensiveBlur: true,
  },
  chromaticAberration: { enabled: false, amount: 30, radialIntensity: 0.3 },
  sharpen: { enabled: false, edgeAmount: 0.3, colorAmount: 1.0 },
  fxaa: { enabled: true },
  dithering: { enabled: false, intensity: 0.004 },
  hdrEnvironment: { enabled: false, texturePath: '', intensity: 1.0, rotationY: 0 },
  exposure: 1.0,
  contrast: 1.0,
};

/** Cinematic preset — heavy bloom, shallow DoF, color grading, vignette. */
const CINEMATIC_PRESET: PostProcessingConfig = {
  enabled: true,
  preset: 'cinematic',
  bloom: { enabled: true, weight: 0.3, threshold: 0.7, kernel: 96, scale: 0.5 },
  depthOfField: {
    enabled: true,
    focalLength: 85,
    fStop: 1.4,
    focusDistance: 0,
    blurLevel: 'high',
  },
  toneMapping: { enabled: true, type: 'aces' },
  colorGrading: { enabled: true, preset: 'cinematic' },
  vignette: {
    enabled: true,
    weight: 3.0,
    stretch: 0,
    color: { r: 0, g: 0, b: 0, a: 1 },
    blendMode: 'multiply',
  },
  grain: { enabled: true, intensity: 15, animated: true },
  ssao: {
    enabled: true,
    totalStrength: 1.5,
    radius: 2.0,
    samples: 24,
    base: 0.1,
    expensiveBlur: true,
  },
  chromaticAberration: { enabled: true, amount: 15, radialIntensity: 0.5 },
  sharpen: { enabled: false, edgeAmount: 0.3, colorAmount: 1.0 },
  fxaa: { enabled: true },
  dithering: { enabled: false, intensity: 0.004 },
  hdrEnvironment: { enabled: false, texturePath: '', intensity: 1.0, rotationY: 0 },
  exposure: 0.9,
  contrast: 1.2,
};

/** Retro preset — pixel-art look with dithering, grain, and desaturation. */
const RETRO_PRESET: PostProcessingConfig = {
  enabled: true,
  preset: 'retro',
  bloom: { enabled: false, weight: 0.15, threshold: 0.9, kernel: 64, scale: 0.5 },
  depthOfField: {
    enabled: false,
    focalLength: 50,
    fStop: 2.8,
    focusDistance: 2000,
    blurLevel: 'medium',
  },
  toneMapping: { enabled: true, type: 'standard' },
  colorGrading: { enabled: true, preset: 'retro' },
  vignette: {
    enabled: false,
    weight: 1.5,
    stretch: 0,
    color: { r: 0, g: 0, b: 0, a: 1 },
    blendMode: 'multiply',
  },
  grain: { enabled: true, intensity: 25, animated: true },
  ssao: {
    enabled: false,
    totalStrength: 1.0,
    radius: 2.0,
    samples: 16,
    base: 0.1,
    expensiveBlur: true,
  },
  chromaticAberration: { enabled: false, amount: 30, radialIntensity: 0.3 },
  sharpen: { enabled: true, edgeAmount: 0.5, colorAmount: 1.0 },
  fxaa: { enabled: true },
  dithering: { enabled: true, intensity: 0.01 },
  hdrEnvironment: { enabled: false, texturePath: '', intensity: 1.0, rotationY: 0 },
  exposure: 0.85,
  contrast: 1.0,
};

/** Fantasy preset — bright and magical with warm tones and soft bloom. */
const FANTASY_PRESET: PostProcessingConfig = {
  enabled: true,
  preset: 'fantasy',
  bloom: { enabled: true, weight: 0.25, threshold: 0.6, kernel: 80, scale: 0.5 },
  depthOfField: {
    enabled: true,
    focalLength: 35,
    fStop: 4.0,
    focusDistance: 0,
    blurLevel: 'low',
  },
  toneMapping: { enabled: true, type: 'aces' },
  colorGrading: { enabled: true, preset: 'warm' },
  vignette: {
    enabled: true,
    weight: 0.8,
    stretch: 0,
    color: { r: 0, g: 0, b: 0, a: 1 },
    blendMode: 'multiply',
  },
  grain: { enabled: false, intensity: 5, animated: true },
  ssao: {
    enabled: true,
    totalStrength: 0.7,
    radius: 2.0,
    samples: 16,
    base: 0.1,
    expensiveBlur: true,
  },
  chromaticAberration: { enabled: false, amount: 30, radialIntensity: 0.3 },
  sharpen: { enabled: false, edgeAmount: 0.3, colorAmount: 1.0 },
  fxaa: { enabled: true },
  dithering: { enabled: false, intensity: 0.004 },
  hdrEnvironment: { enabled: false, texturePath: '', intensity: 1.0, rotationY: 0 },
  exposure: 1.1,
  contrast: 1.0,
};

/**
 * Frozen record of all named post-processing presets.
 *
 * @example
 * ```typescript
 * import { POST_PROCESSING_PRESETS } from './post-processing-presets';
 *
 * const hd2d = POST_PROCESSING_PRESETS.hd2d;
 * ```
 */
export const POST_PROCESSING_PRESETS: Readonly<
  Record<PostProcessingPresetName, PostProcessingConfig>
> = Object.freeze({
  neutral: NEUTRAL_PRESET,
  hd2d: HD2D_PRESET,
  cinematic: CINEMATIC_PRESET,
  retro: RETRO_PRESET,
  fantasy: FANTASY_PRESET,
});

// =============================================================================
// Preset Lookup
// =============================================================================

/**
 * Returns a complete PostProcessingConfig for a named preset.
 *
 * @param name - The preset name to look up.
 * @returns Result containing the preset config, or error for unknown names.
 *
 * @example
 * ```typescript
 * const result = getPostProcessingPreset('hd2d');
 * if (!result.ok) return result;
 * result.data.bloom?.weight; // 0.15
 * ```
 */
export function getPostProcessingPreset(
  name: PostProcessingPresetName,
): Result<PostProcessingConfig> {
  const preset: PostProcessingConfig | undefined = POST_PROCESSING_PRESETS[name];
  if (!preset) {
    return err(ERRORS.SCENE.LOAD_FAILED, `Unknown post-processing preset: ${String(name)}`);
  }
  return okUnchecked(preset);
}

// =============================================================================
// Config Resolver
// =============================================================================

/**
 * Resolves a post-processing config by merging overrides onto a preset base.
 *
 * 1. Looks up the preset by name (defaults to `'hd2d'`).
 * 2. Deep-merges per-effect overrides from the input config.
 * 3. Validates and returns the fully resolved config.
 *
 * @param config - Partial config with optional overrides.
 * @returns Result containing the fully resolved PostProcessingConfig.
 *
 * @example
 * ```typescript
 * const result = resolvePostProcessingConfig({
 *   preset: 'hd2d',
 *   bloom: { weight: 0.3 },
 * });
 * if (!result.ok) return result;
 * result.data.bloom?.weight; // 0.3 (overridden)
 * result.data.bloom?.threshold; // 0.9 (from preset)
 * ```
 */
export function resolvePostProcessingConfig(
  config: PostProcessingConfigInput,
): Result<PostProcessingConfig> {
  const presetName: PostProcessingPresetName = (config.preset ??
    'hd2d') as PostProcessingPresetName;
  const presetResult: Result<PostProcessingConfig> = getPostProcessingPreset(presetName);
  if (!presetResult.ok) return presetResult;

  const base: PostProcessingConfig = presetResult.data;

  const merged = {
    enabled: config.enabled ?? base.enabled,
    preset: presetName,
    bloom: config.bloom ? { ...base.bloom, ...config.bloom } : base.bloom,
    depthOfField: config.depthOfField
      ? { ...base.depthOfField, ...config.depthOfField }
      : base.depthOfField,
    toneMapping: config.toneMapping
      ? { ...base.toneMapping, ...config.toneMapping }
      : base.toneMapping,
    colorGrading: config.colorGrading
      ? { ...base.colorGrading, ...config.colorGrading }
      : base.colorGrading,
    vignette: config.vignette ? { ...base.vignette, ...config.vignette } : base.vignette,
    grain: config.grain ? { ...base.grain, ...config.grain } : base.grain,
    ssao: config.ssao ? { ...base.ssao, ...config.ssao } : base.ssao,
    chromaticAberration: config.chromaticAberration
      ? { ...base.chromaticAberration, ...config.chromaticAberration }
      : base.chromaticAberration,
    sharpen: config.sharpen ? { ...base.sharpen, ...config.sharpen } : base.sharpen,
    fxaa: config.fxaa ? { ...base.fxaa, ...config.fxaa } : base.fxaa,
    dithering: config.dithering ? { ...base.dithering, ...config.dithering } : base.dithering,
    hdrEnvironment: config.hdrEnvironment
      ? { ...base.hdrEnvironment, ...config.hdrEnvironment }
      : base.hdrEnvironment,
    exposure: config.exposure ?? base.exposure,
    contrast: config.contrast ?? base.contrast,
  };

  return safeParse(PostProcessingConfigSchema, merged);
}

// =============================================================================
// Quality Scaling
// =============================================================================

/**
 * Adjusts expensive post-processing effects based on quality preset.
 *
 * | Effect | Low | Medium | High | Ultra |
 * |--------|-----|--------|------|-------|
 * | SSAO | disabled | samples=8 | unchanged | samples=32 |
 * | DoF | disabled | blurLevel='low' | unchanged | blurLevel='high' |
 * | Bloom | kernel=32 | kernel=48 | unchanged | kernel=128 |
 * | Grain | disabled | unchanged | unchanged | unchanged |
 * | Chrom. aberr. | disabled | disabled | unchanged | unchanged |
 *
 * @param config - Fully resolved PostProcessingConfig.
 * @param quality - Quality preset level.
 * @returns Result containing the quality-adjusted config.
 *
 * @example
 * ```typescript
 * const scaled = applyQualityScaling(resolvedConfig, 'medium');
 * if (!scaled.ok) return scaled;
 * scaled.data.ssao?.samples; // 8 (reduced from 16)
 * ```
 */
export function applyQualityScaling(
  config: PostProcessingConfig,
  quality: QualityPreset,
): Result<PostProcessingConfig> {
  if (quality === 'high') {
    return okUnchecked(config);
  }

  const scaled: PostProcessingConfig = {
    ...config,
    bloom: config.bloom ? { ...config.bloom } : undefined,
    depthOfField: config.depthOfField ? { ...config.depthOfField } : undefined,
    grain: config.grain ? { ...config.grain } : undefined,
    ssao: config.ssao ? { ...config.ssao } : undefined,
    chromaticAberration: config.chromaticAberration ? { ...config.chromaticAberration } : undefined,
  };

  if (quality === 'low') {
    if (scaled.ssao) scaled.ssao.enabled = false;
    if (scaled.depthOfField) scaled.depthOfField.enabled = false;
    if (scaled.grain) scaled.grain.enabled = false;
    if (scaled.chromaticAberration) scaled.chromaticAberration.enabled = false;
    if (scaled.bloom) scaled.bloom.kernel = 32;
  } else if (quality === 'medium') {
    if (scaled.ssao) scaled.ssao.samples = 8;
    if (scaled.depthOfField) scaled.depthOfField.blurLevel = 'low';
    if (scaled.bloom) scaled.bloom.kernel = 48;
    if (scaled.chromaticAberration) scaled.chromaticAberration.enabled = false;
  } else if (quality === 'ultra') {
    if (scaled.ssao) scaled.ssao.samples = 32;
    if (scaled.bloom) scaled.bloom.kernel = 128;
    if (scaled.depthOfField) scaled.depthOfField.blurLevel = 'high';
  }

  return okUnchecked(scaled);
}

// =============================================================================
// Color Grading Curves
// =============================================================================

/**
 * Builds Babylon.js ColorCurves for a named color grading preset.
 *
 * | Preset | Global | Highlights | Midtones | Shadows |
 * |--------|--------|------------|----------|---------|
 * | neutral | — | — | — | — |
 * | warm | hue=30, sat=20 | hue=40, exp=0.1 | sat=10 | hue=20, dens=40 |
 * | cool | hue=210, sat=10 | hue=220, exp=-0.05 | sat=5 | hue=240, dens=30 |
 * | cinematic | — | hue=200, sat=-10, exp=-0.1 | sat=5 | hue=30, dens=60, sat=15 |
 * | retro | sat=-30 | exp=-0.2 | sat=-20 | dens=80, sat=-10 |
 *
 * @param preset - Color grading preset name.
 * @returns BabylonResult containing the configured ColorCurves instance.
 *
 * @example
 * ```typescript
 * const result = buildColorCurves('warm');
 * if (!result.ok) return result;
 * scene.imageProcessingConfiguration.colorCurves = result.data;
 * ```
 */
export function buildColorCurves(preset: ColorGradingPreset): BabylonResult<BABYLON.ColorCurves> {
  const curves: BABYLON.ColorCurves = new BABYLON.ColorCurves();

  switch (preset) {
    case 'neutral': {
      break;
    }

    case 'warm': {
      curves.globalHue = 30;
      curves.globalSaturation = 20;
      curves.highlightsHue = 40;
      curves.highlightsExposure = 0.1;
      curves.midtonesSaturation = 10;
      curves.shadowsHue = 20;
      curves.shadowsDensity = 40;
      break;
    }

    case 'cool': {
      curves.globalHue = 210;
      curves.globalSaturation = 10;
      curves.highlightsHue = 220;
      curves.highlightsExposure = -0.05;
      curves.midtonesSaturation = 5;
      curves.shadowsHue = 240;
      curves.shadowsDensity = 30;
      break;
    }

    case 'cinematic': {
      curves.highlightsHue = 200;
      curves.highlightsSaturation = -10;
      curves.highlightsExposure = -0.1;
      curves.midtonesSaturation = 5;
      curves.shadowsHue = 30;
      curves.shadowsDensity = 60;
      curves.shadowsSaturation = 15;
      break;
    }

    case 'retro': {
      curves.globalSaturation = -30;
      curves.highlightsExposure = -0.2;
      curves.midtonesSaturation = -20;
      curves.shadowsDensity = 80;
      curves.shadowsSaturation = -10;
      break;
    }

    default: {
      return err(ERRORS.SCENE.LOAD_FAILED, `Unknown color grading preset: ${String(preset)}`);
    }
  }

  return okShallow(curves);
}
