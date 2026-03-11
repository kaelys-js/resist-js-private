/**
 * Quality configuration schema tests.
 *
 * Tests the QualityPreset picklist, QualityConfig schema,
 * and the preset resolution helper that maps preset names to
 * concrete engine configuration overrides.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { QualityConfigSchema, QUALITY_PRESETS, type QualityConfig } from './quality-config';

// =============================================================================
// QualityConfigSchema
// =============================================================================

describe('QualityConfigSchema', () => {
  test('accepts minimal config (all defaults)', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {});
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.preset).toBe('high');
  });

  test('hardwareScalingLevel is optional (preset default applied later)', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {});
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.hardwareScalingLevel).toBeUndefined();
  });

  test('accepts all preset values', () => {
    const presets: string[] = ['low', 'medium', 'high', 'ultra'];
    for (const preset of presets) {
      const result: Result<QualityConfig> = safeParse(QualityConfigSchema, { preset });
      expect(result.ok).toBeTruthy();
      if (!result.ok) return;
      expect(result.data.preset).toBe(preset);
    }
  });

  test('accepts explicit hardwareScalingLevel', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      preset: 'medium',
      hardwareScalingLevel: 1.25,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.hardwareScalingLevel).toBeCloseTo(1.25);
  });

  test('accepts hardwareScalingLevel at minimum (0.25)', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      hardwareScalingLevel: 0.25,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.hardwareScalingLevel).toBeCloseTo(0.25);
  });

  test('accepts hardwareScalingLevel at maximum (4)', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      hardwareScalingLevel: 4,
    });
    expect(result.ok).toBeTruthy();
    if (!result.ok) return;
    expect(result.data.hardwareScalingLevel).toBe(4);
  });

  // =========================================================================
  // Rejection
  // =========================================================================

  test('rejects invalid preset value', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      preset: 'extreme',
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects hardwareScalingLevel below minimum (0.24)', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      hardwareScalingLevel: 0.1,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects hardwareScalingLevel above maximum (4.1)', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      hardwareScalingLevel: 5,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects hardwareScalingLevel as string', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      hardwareScalingLevel: '1.0',
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects unknown properties', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, {
      preset: 'high',
      shadows: true,
    });
    expect(result.ok).toBeFalsy();
  });

  test('rejects null input', () => {
    const result: Result<QualityConfig> = safeParse(QualityConfigSchema, null);
    expect(result.ok).toBeFalsy();
  });
});

// =============================================================================
// QUALITY_PRESETS constant
// =============================================================================

describe('QUALITY_PRESETS', () => {
  test('low preset has half resolution', () => {
    expect(QUALITY_PRESETS.low.hardwareScalingLevel).toBe(2.0);
    expect(QUALITY_PRESETS.low.adaptToDeviceRatio).toBeFalsy();
    expect(QUALITY_PRESETS.low.antialias).toBeFalsy();
    expect(QUALITY_PRESETS.low.stencil).toBeFalsy();
  });

  test('medium preset has 1.5x scaling', () => {
    expect(QUALITY_PRESETS.medium.hardwareScalingLevel).toBe(1.5);
    expect(QUALITY_PRESETS.medium.adaptToDeviceRatio).toBeFalsy();
    expect(QUALITY_PRESETS.medium.antialias).toBeTruthy();
    expect(QUALITY_PRESETS.medium.stencil).toBeTruthy();
  });

  test('high preset has native resolution', () => {
    expect(QUALITY_PRESETS.high.hardwareScalingLevel).toBe(1.0);
    expect(QUALITY_PRESETS.high.adaptToDeviceRatio).toBeTruthy();
    expect(QUALITY_PRESETS.high.antialias).toBeTruthy();
    expect(QUALITY_PRESETS.high.stencil).toBeTruthy();
  });

  test('ultra preset has supersampled resolution', () => {
    expect(QUALITY_PRESETS.ultra.hardwareScalingLevel).toBe(0.5);
    expect(QUALITY_PRESETS.ultra.adaptToDeviceRatio).toBeTruthy();
    expect(QUALITY_PRESETS.ultra.antialias).toBeTruthy();
    expect(QUALITY_PRESETS.ultra.stencil).toBeTruthy();
  });

  test('all four presets exist', () => {
    const keys: string[] = Object.keys(QUALITY_PRESETS);
    expect(keys).toEqual(['low', 'medium', 'high', 'ultra']);
  });
});
