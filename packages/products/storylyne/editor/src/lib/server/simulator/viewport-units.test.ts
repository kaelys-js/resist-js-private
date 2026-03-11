/**
 * Tests for dynamic viewport unit measurement scripts.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildViewportUnitsScript, parseViewportUnitsResult } from './viewport-units';

describe('viewport-units', () => {
  describe('buildViewportUnitsScript', () => {
    it('returns valid JavaScript expression', () => {
      const script: Str = buildViewportUnitsScript();
      expect(script).toContain('getBoundingClientRect');
      expect(script).toContain('JSON.stringify');
      expect(script).toContain('svh');
      expect(script).toContain('lvh');
      expect(script).toContain('dvh');
    });
  });

  describe('parseViewportUnitsResult', () => {
    it('parses valid JSON result', () => {
      const json: Str = '{"svh":7.12,"lvh":8.44,"dvh":7.12}' as Str;
      const result = parseViewportUnitsResult(json);
      expect(result).not.toBeNull();
      expect(result?.svh).toBe(7.12);
      expect(result?.lvh).toBe(8.44);
      expect(result?.dvh).toBe(7.12);
    });

    it('returns null for invalid JSON', () => {
      const result = parseViewportUnitsResult('not json' as Str);
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseViewportUnitsResult('' as Str);
      expect(result).toBeNull();
    });

    it('returns null when values are not numbers', () => {
      const json: Str = '{"svh":"bad","lvh":null,"dvh":true}' as Str;
      const result = parseViewportUnitsResult(json);
      expect(result).toBeNull();
    });
  });
});
