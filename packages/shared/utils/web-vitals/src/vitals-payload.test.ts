/**
 * Tests for the vitals beacon payload schema and conversion.
 *
 * Verifies schema validation, PII stripping (query param removal),
 * and payload construction.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Str, Name, Uuid, RelativeUrl, IsoTimestamp } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import {
  VitalsMetricSchema,
  VitalsDeviceSchema,
  VitalsBeaconPayloadSchema,
  toVitalsPayload,
  type VitalsMetric,
  type VitalsDevice,
  type VitalsBeaconPayload,
} from './vitals-payload';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a valid VitalsMetric fixture.
 *
 * @param overrides - Partial overrides for metric properties
 * @returns A complete VitalsMetric object
 */
function createMetric(overrides: Partial<VitalsMetric> = {}): VitalsMetric {
  return {
    name: 'LCP' as Name, // cast safe: test fixture with valid Name
    value: 2450,
    rating: 'needsImprovement',
    navigationType: 'navigate',
    ...overrides,
  };
}

/**
 * Creates a valid VitalsDevice fixture.
 *
 * @param overrides - Partial overrides for device properties
 * @returns A complete VitalsDevice object
 */
function createDevice(overrides: Partial<VitalsDevice> = {}): VitalsDevice {
  return {
    isLowEndDevice: false,
    isLowEndExperience: false,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    effectiveType: '4g',
    saveData: false,
    ...overrides,
  };
}

/**
 * Creates a valid full payload fixture.
 *
 * @returns A complete VitalsBeaconPayload object
 */
function createPayload(): VitalsBeaconPayload {
  return {
    sessionId: '550e8400-e29b-41d4-a716-446655440000' as Uuid, // cast safe: test fixture with valid UUID
    url: '/scenes/1' as RelativeUrl, // cast safe: test fixture with valid relative URL
    timestamp: '2026-03-06T09:00:00.000Z' as IsoTimestamp, // cast safe: test fixture with valid ISO timestamp
    metrics: [createMetric()],
    device: createDevice(),
  };
}

// ── VitalsMetricSchema ─────────────────────────────────────────────────────

describe('VitalsMetricSchema', () => {
  it('validates a correct metric', () => {
    const result: Result<VitalsMetric> = safeParse(VitalsMetricSchema, createMetric());
    expect(result.ok).toBe(true);
  });

  it('rejects empty metric name', () => {
    const result: Result<VitalsMetric> = safeParse(
      VitalsMetricSchema,
      createMetric({ name: '' as Name }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects invalid rating', () => {
    const result = safeParse(VitalsMetricSchema, { ...createMetric(), rating: 'excellent' });
    expect(result.ok).toBe(false);
  });

  it('accepts all valid ratings', () => {
    const ratings: readonly Str[] = ['good', 'needsImprovement', 'poor'];

    for (const rating of ratings) {
      const result: Result<VitalsMetric> = safeParse(
        VitalsMetricSchema,
        createMetric({ rating: rating as VitalsMetric['rating'] }),
      );
      expect(result.ok).toBe(true);
    }
  });
});

// ── VitalsDeviceSchema ─────────────────────────────────────────────────────

describe('VitalsDeviceSchema', () => {
  it('validates a correct device', () => {
    const result: Result<VitalsDevice> = safeParse(VitalsDeviceSchema, createDevice());
    expect(result.ok).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = safeParse(VitalsDeviceSchema, { isLowEndDevice: false });
    expect(result.ok).toBe(false);
  });

  it('rejects extra unknown fields (strict)', () => {
    const result = safeParse(VitalsDeviceSchema, {
      ...createDevice(),
      unknownField: 'should fail',
    });
    expect(result.ok).toBe(false);
  });
});

// ── VitalsBeaconPayloadSchema ──────────────────────────────────────────────

describe('VitalsBeaconPayloadSchema', () => {
  it('validates a correct full payload', () => {
    const result: Result<VitalsBeaconPayload> = safeParse(
      VitalsBeaconPayloadSchema,
      createPayload(),
    );
    expect(result.ok).toBe(true);
  });

  it('rejects invalid sessionId (not UUID)', () => {
    const result = safeParse(VitalsBeaconPayloadSchema, {
      ...createPayload(),
      sessionId: 'not-a-uuid',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid timestamp (not ISO)', () => {
    const result = safeParse(VitalsBeaconPayloadSchema, {
      ...createPayload(),
      timestamp: 'not-a-timestamp',
    });
    expect(result.ok).toBe(false);
  });

  it('accepts empty metrics array', () => {
    const result: Result<VitalsBeaconPayload> = safeParse(VitalsBeaconPayloadSchema, {
      ...createPayload(),
      metrics: [],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects extra unknown fields (strict)', () => {
    const result = safeParse(VitalsBeaconPayloadSchema, {
      ...createPayload(),
      user: { email: 'pii@example.com' },
    });
    expect(result.ok).toBe(false);
  });
});

// ── toVitalsPayload ────────────────────────────────────────────────────────

describe('toVitalsPayload', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('produces a valid payload from metrics and device', () => {
    const metrics: VitalsMetric[] = [createMetric()];
    const device: VitalsDevice = createDevice();

    const result: Result<VitalsBeaconPayload> = toVitalsPayload(metrics, device, '/test-page');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.url).toBe('/test-page');
      expect(result.data.metrics).toHaveLength(1);
      expect(result.data.device).toEqual(device);
    }
  });

  it('strips query params from URL for PII safety', () => {
    const result: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/scenes/1?token=secret&debug=true',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('/scenes/1');
    }
  });

  it('strips hash from URL', () => {
    const result: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/scenes/1#section',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('/scenes/1');
    }
  });

  it('includes ISO timestamp', () => {
    const result: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/test',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should be a valid ISO 8601 timestamp
      expect(new Date(result.data.timestamp).toISOString()).toBe(result.data.timestamp);
    }
  });

  it('handles empty metrics array', () => {
    const result: Result<VitalsBeaconPayload> = toVitalsPayload([], createDevice(), '/test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.metrics).toHaveLength(0);
    }
  });

  it('strips both query params and hash from URL', () => {
    const result: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/scenes/1?token=secret#section',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('/scenes/1');
    }
  });

  it('handles hash before query in malformed URL', () => {
    const result: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/page#section?param=value',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Math.min picks hash index since it comes first
      expect(result.data.url).toBe('/page');
    }
  });

  it('returns error when metrics array contains invalid metric', () => {
    const result = toVitalsPayload(
      [{ name: '' }] as unknown as VitalsMetric[],
      createDevice(),
      '/test',
    );
    expect(result.ok).toBe(false);
  });

  it('returns error when device is invalid', () => {
    const result = toVitalsPayload([], { invalid: true } as unknown as VitalsDevice, '/test');
    expect(result.ok).toBe(false);
  });

  it('returns error when url is not a string', () => {
    const result = toVitalsPayload([], createDevice(), 123 as unknown as Str);
    expect(result.ok).toBe(false);
  });

  it('handles URL with trailing ? or #', () => {
    const result1: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/page?',
    );
    expect(result1.ok).toBe(true);
    if (result1.ok) {
      expect(result1.data.url).toBe('/page');
    }

    const result2: Result<VitalsBeaconPayload> = toVitalsPayload(
      [createMetric()],
      createDevice(),
      '/page#',
    );
    expect(result2.ok).toBe(true);
    if (result2.ok) {
      expect(result2.data.url).toBe('/page');
    }
  });

  it('returns error when crypto.randomUUID returns invalid UUID (line 175)', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'not-a-uuid',
    });

    const result = toVitalsPayload([createMetric()], createDevice(), '/test');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns error when stripped URL fails RelativeUrlSchema (line 179)', () => {
    // URL '?foo' strips to '' (indexOf('?') = 0, slice(0,0) = ''), which lacks leading '/'
    const result = toVitalsPayload([createMetric()], createDevice(), '?foo');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });

  it('returns error when Date.toISOString returns invalid timestamp (line 186)', () => {
    const spy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('invalid');

    const result = toVitalsPayload([createMetric()], createDevice(), '/test');

    spy.mockRestore();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION.SCHEMA_FAILED');
    }
  });
});
