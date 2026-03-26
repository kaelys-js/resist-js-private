/**
 * Streaming config schema tests.
 *
 * Tests for streaming/virtualization configuration validation
 * used by maps larger than 16384² tiles.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { StreamingConfigSchema, type StreamingConfig } from './streaming-config';

// =============================================================================
// Default values
// =============================================================================

describe('StreamingConfigSchema — defaults', () => {
  test('accepts empty object with defaults', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regionSize).toBe(2048);
    expect(result.data.maxLoadedRegions).toBe(16);
    expect(result.data.loadRadius).toBe(1);
    expect(result.data.unloadDistance).toBe(3);
  });

  test('accepts all defaults explicitly', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      regionSize: 2048,
      maxLoadedRegions: 16,
      loadRadius: 1,
      unloadDistance: 3,
    });
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// regionSize
// =============================================================================

describe('StreamingConfigSchema — regionSize', () => {
  test('accepts 2048', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, { regionSize: 2048 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regionSize).toBe(2048);
  });

  test('accepts 4096', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, { regionSize: 4096 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.regionSize).toBe(4096);
  });

  test('rejects 1024', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, { regionSize: 1024 });
    expect(result.ok).toBe(false);
  });

  test('rejects 8192', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, { regionSize: 8192 });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// maxLoadedRegions
// =============================================================================

describe('StreamingConfigSchema — maxLoadedRegions', () => {
  test('accepts minimum (4)', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      maxLoadedRegions: 4,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.maxLoadedRegions).toBe(4);
  });

  test('accepts maximum (64)', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      maxLoadedRegions: 64,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.maxLoadedRegions).toBe(64);
  });

  test('rejects below minimum', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      maxLoadedRegions: 3,
    });
    expect(result.ok).toBe(false);
  });

  test('rejects above maximum', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      maxLoadedRegions: 65,
    });
    expect(result.ok).toBe(false);
  });

  test('rejects non-integer', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      maxLoadedRegions: 10.5,
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// loadRadius
// =============================================================================

describe('StreamingConfigSchema — loadRadius', () => {
  test('accepts minimum (0)', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      loadRadius: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.loadRadius).toBe(0);
  });

  test('accepts maximum (4)', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      loadRadius: 4,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.loadRadius).toBe(4);
  });

  test('rejects above maximum', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      loadRadius: 5,
    });
    expect(result.ok).toBe(false);
  });

  test('rejects negative', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      loadRadius: -1,
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// unloadDistance
// =============================================================================

describe('StreamingConfigSchema — unloadDistance', () => {
  test('accepts minimum (2)', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      unloadDistance: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.unloadDistance).toBe(2);
  });

  test('accepts maximum (8)', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      unloadDistance: 8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.unloadDistance).toBe(8);
  });

  test('rejects below minimum', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      unloadDistance: 1,
    });
    expect(result.ok).toBe(false);
  });

  test('rejects above maximum', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      unloadDistance: 9,
    });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// Strict object
// =============================================================================

describe('StreamingConfigSchema — strict', () => {
  test('rejects unknown properties', () => {
    const result: Result<StreamingConfig> = safeParse(StreamingConfigSchema, {
      regionSize: 2048,
      unknownField: true,
    });
    expect(result.ok).toBe(false);
  });
});
