/**
 * Tests for `chart/chart-utils.ts`.
 *
 * Focused on `getPayloadConfigFromPayload`, which walks a tooltip payload to
 * find the matching `ChartConfig` entry. Every branch of its decision tree
 * (null payload → short-circuit, `payload.key` match, `payload.name` match,
 * direct key lookup, nested `payload.payload.key` lookup, both config lookup
 * branches) is exercised against the exported `THEMES` constant.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { getPayloadConfigFromPayload, THEMES, type ChartConfig } from './chart-utils';

const CONFIG: ChartConfig = {
  alpha: { label: 'Alpha', color: '#f00' },
  beta: { label: 'Beta', color: '#0f0' },
  gamma: { label: 'Gamma', theme: { dark: '#111', light: '#eee' } },
};

describe('THEMES', () => {
  it('exposes the dark and light selectors as a frozen literal', () => {
    expect(THEMES).toEqual({ dark: '.dark', light: '' });
  });
});

describe('getPayloadConfigFromPayload', () => {
  it('returns undefined for a non-object payload', () => {
    const result = getPayloadConfigFromPayload(CONFIG, 'not-an-object' as never, 'alpha');
    expect(result).toBeUndefined();
  });

  it('returns undefined for a null payload', () => {
    const result = getPayloadConfigFromPayload(CONFIG, null as never, 'alpha');
    expect(result).toBeUndefined();
  });

  it('uses payload.key when it matches the requested key', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'alpha', name: 'zzz', payload: {} } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.alpha);
  });

  it('uses payload.name when it matches the requested key (and payload.key does not)', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'beta', payload: {} } as never,
      'beta',
    );
    expect(result).toEqual(CONFIG.beta);
  });

  it('uses payload[key] when key is present directly and maps to a string', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', alpha: 'gamma' } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.gamma);
  });

  it('uses payload.payload[key] when nested value is a string and top-level does not match', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', payload: { alpha: 'gamma' } } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.gamma);
  });

  it('falls back to config[key] when nothing matches', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', payload: {} } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.alpha);
  });

  it('returns undefined when neither configLabelKey nor key resolves in config', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', payload: {} } as never,
      'missing-key',
    );
    expect(result).toBeUndefined();
  });

  it('ignores payload[key] when the value is not a string (number)', () => {
    /* Falls through to nested or fallback branches. */
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', alpha: 42, payload: { alpha: 'beta' } } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.beta);
  });

  it('ignores payload.payload when it is null (takes fallback path)', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', payload: null } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.alpha);
  });

  it('ignores payload.payload when it is not an object', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', payload: 'a-string' } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.alpha);
  });

  it('ignores nested payload.payload[key] when its value is not a string', () => {
    const result = getPayloadConfigFromPayload(
      CONFIG,
      { key: 'zzz', name: 'zzz', payload: { alpha: 99 } } as never,
      'alpha',
    );
    expect(result).toEqual(CONFIG.alpha);
  });
});
