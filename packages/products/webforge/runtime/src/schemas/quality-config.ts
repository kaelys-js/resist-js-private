/**
 * Quality configuration schema.
 *
 * Provides named presets (low, medium, high, ultra) that map to concrete
 * engine configuration overrides: hardware scaling level, antialiasing,
 * device pixel ratio adaptation, and stencil buffer.
 *
 * The `QUALITY_PRESETS` constant holds the preset-to-settings mapping.
 * The runtime applies preset defaults first, then explicit engine config
 * overrides win. Explicit `hardwareScalingLevel` in the quality config
 * overrides the preset's value.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { QualityConfigSchema, QUALITY_PRESETS, type QualityConfig } from './quality-config';
 *
 * const result = safeParse(QualityConfigSchema, { preset: 'ultra' });
 * if (result.ok) {
 *   const settings = QUALITY_PRESETS[result.data.preset];
 *   settings.hardwareScalingLevel; // 0.5 (supersampled)
 * }
 * ```
 *
 * @module
 */

import * as v from 'valibot';

/**
 * Quality preset name picklist.
 *
 * - `'low'` — half resolution, no AA, no stencil.
 * - `'medium'` — 1.5x scaling, AA enabled.
 * - `'high'` — native resolution, AA, HiDPI adaptation (default).
 * - `'ultra'` — supersampled at 0.5x scaling, AA, HiDPI.
 */
export const QualityPresetSchema = v.picklist(['low', 'medium', 'high', 'ultra']);

/** Inferred quality preset type from {@link QualityPresetSchema}. */
export type QualityPreset = v.InferOutput<typeof QualityPresetSchema>;

/**
 * Quality configuration schema.
 *
 * All fields are optional — defaults to `'high'` preset.
 * When `hardwareScalingLevel` is provided, it overrides the preset's value.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * import { QualityConfigSchema } from './quality-config';
 *
 * // Use low preset
 * const result = safeParse(QualityConfigSchema, { preset: 'low' });
 *
 * // Use high preset but override resolution
 * const custom = safeParse(QualityConfigSchema, {
 *   preset: 'high',
 *   hardwareScalingLevel: 0.75,
 * });
 * ```
 */
export const QualityConfigSchema = v.strictObject({
  /** Named quality preset. Default: 'high'. */
  preset: v.optional(QualityPresetSchema, 'high'),

  /**
   * Hardware scaling level override.
   *
   * Lower = higher resolution (0.5 = 2x supersampling).
   * Higher = lower resolution (2.0 = half resolution).
   * Range: [0.25, 4].
   *
   * When undefined, uses the preset's default value.
   */
  hardwareScalingLevel: v.optional(v.pipe(v.number(), v.minValue(0.25), v.maxValue(4))),
});

/** Inferred quality configuration type from {@link QualityConfigSchema}. */
export type QualityConfig = v.InferOutput<typeof QualityConfigSchema>;

// =============================================================================
// Preset Definitions
// =============================================================================

/** Engine overrides for a quality preset. */
export type QualityPresetSettings = {
  /** Hardware scaling level (lower = higher resolution). */
  readonly hardwareScalingLevel: number;
  /** Whether to adapt to device pixel ratio. */
  readonly adaptToDeviceRatio: boolean;
  /** Whether to enable MSAA antialiasing. */
  readonly antialias: boolean;
  /** Whether to enable the stencil buffer. */
  readonly stencil: boolean;
};

/**
 * Mapping of quality preset names to concrete engine configuration overrides.
 *
 * Applied by the runtime before explicit engine config values.
 * Explicit values always win over preset defaults.
 *
 * | Preset | Scaling | HiDPI | AA | Stencil |
 * |--------|---------|-------|----|---------|
 * | low    | 2.0     | off   | off| off     |
 * | medium | 1.5     | off   | on | on      |
 * | high   | 1.0     | on    | on | on      |
 * | ultra  | 0.5     | on    | on | on      |
 */
export const QUALITY_PRESETS: Readonly<Record<QualityPreset, QualityPresetSettings>> = {
  low: {
    hardwareScalingLevel: 2.0,
    adaptToDeviceRatio: false,
    antialias: false,
    stencil: false,
  },
  medium: {
    hardwareScalingLevel: 1.5,
    adaptToDeviceRatio: false,
    antialias: true,
    stencil: true,
  },
  high: {
    hardwareScalingLevel: 1.0,
    adaptToDeviceRatio: true,
    antialias: true,
    stencil: true,
  },
  ultra: {
    hardwareScalingLevel: 0.5,
    adaptToDeviceRatio: true,
    antialias: true,
    stencil: true,
  },
};
