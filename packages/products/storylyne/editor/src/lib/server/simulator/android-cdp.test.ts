/**
 * Tests for Chrome DevTools Protocol over ADB.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildAdbForwardArgs, parseCdpResponse } from './android-cdp';

describe('android-cdp', () => {
  describe('buildAdbForwardArgs', () => {
    it('builds adb forward args for CDP', () => {
      const args: Str[] = buildAdbForwardArgs('emulator-5554' as Str);
      expect(args).toContain('-s');
      expect(args).toContain('emulator-5554');
      expect(args).toContain('forward');
      expect(args.some((a: Str): boolean => (a as string).startsWith('tcp:'))).toBe(true);
      expect(args).toContain('localabstract:chrome_devtools_remote');
    });
  });

  describe('parseCdpResponse', () => {
    it('parses a CDP result response', () => {
      const raw: Str = JSON.stringify({
        id: 1,
        result: { result: { type: 'boolean', value: true } },
      }) as Str;

      const parsed = parseCdpResponse(raw);
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe(1);
      expect(parsed?.result).toEqual({ result: { type: 'boolean', value: true } });
    });

    it('returns null for invalid JSON', () => {
      const parsed = parseCdpResponse('not json' as Str);
      expect(parsed).toBeNull();
    });

    it('parses event messages', () => {
      const raw: Str = JSON.stringify({
        method: 'Log.entryAdded',
        params: { entry: { level: 'error', text: 'Oops' } },
      }) as Str;

      const parsed = parseCdpResponse(raw);
      expect(parsed).not.toBeNull();
      expect(parsed?.method).toBe('Log.entryAdded');
    });
  });
});
