/**
 * Tests for Android page-load detection via CDP.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildReadyCheckScript, parseEvalResponse } from './android-page-load';

describe('android-page-load', () => {
  describe('buildReadyCheckScript', () => {
    it('returns a JS expression checking data-lens-ready', () => {
      const script: Str = buildReadyCheckScript();
      expect(script).toContain('data-lens-ready');
      expect(script).toContain('querySelector');
    });
  });

  describe('parseEvalResponse', () => {
    it('returns true when result value is true', () => {
      const raw: Str = JSON.stringify({
        id: 1,
        result: { result: { type: 'boolean', value: true } },
      }) as Str;
      expect(parseEvalResponse(raw)).toBe(true);
    });

    it('returns false when result value is false', () => {
      const raw: Str = JSON.stringify({
        id: 1,
        result: { result: { type: 'boolean', value: false } },
      }) as Str;
      expect(parseEvalResponse(raw)).toBe(false);
    });

    it('returns false for invalid JSON', () => {
      expect(parseEvalResponse('bad json' as Str)).toBe(false);
    });

    it('returns false for missing result', () => {
      const raw: Str = JSON.stringify({ id: 1 }) as Str;
      expect(parseEvalResponse(raw)).toBe(false);
    });
  });
});
