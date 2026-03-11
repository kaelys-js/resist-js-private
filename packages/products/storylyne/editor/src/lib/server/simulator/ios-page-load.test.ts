/**
 * Tests for iOS Simulator page-load detection.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildReadyCheckScript, parseEvalResponse } from './ios-page-load';

describe('ios-page-load', () => {
  describe('buildReadyCheckScript', () => {
    it('returns a JavaScript expression that checks data-lens-ready', () => {
      const script: Str = buildReadyCheckScript();
      expect(script).toContain('data-lens-ready');
      expect(script).toContain('querySelector');
    });
  });

  describe('parseEvalResponse', () => {
    it('returns true when result value is true', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'boolean',
            value: true,
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(true);
    });

    it('returns false when result value is false', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'boolean',
            value: false,
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(false);
    });

    it('returns false for null result', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'object',
            subtype: 'null',
            value: null,
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(false);
    });

    it('returns false for error responses', () => {
      const response: Str = JSON.stringify({
        id: 1,
        error: { code: -32_000, message: 'Cannot find context' },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(false);
    });

    it('returns false for invalid JSON', () => {
      expect(parseEvalResponse('not json' as Str)).toBe(false);
    });

    it('returns true for string "true" result', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'string',
            value: 'true',
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(true);
    });
  });
});
