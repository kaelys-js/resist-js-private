/**
 * Tests for Android Emulator lifecycle management.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildEmulatorArgs, parseBootStatus } from './android-lifecycle';

describe('android-lifecycle', () => {
  describe('buildEmulatorArgs', () => {
    it('builds basic emulator launch args', () => {
      const args: Str[] = buildEmulatorArgs('Pixel_9_API_35' as Str);
      expect(args).toContain('-avd');
      expect(args).toContain('Pixel_9_API_35');
      expect(args).toContain('-no-window');
      expect(args).toContain('-no-audio');
    });

    it('includes gpu option', () => {
      const args: Str[] = buildEmulatorArgs('Pixel_9_API_35' as Str);
      expect(args).toContain('-gpu');
      expect(args).toContain('swiftshader_indirect');
    });
  });

  describe('parseBootStatus', () => {
    it('detects completed boot', () => {
      const completed: boolean = parseBootStatus('1' as Str);
      expect(completed).toBe(true);
    });

    it('detects incomplete boot', () => {
      const completed: boolean = parseBootStatus('' as Str);
      expect(completed).toBe(false);
    });

    it('detects incomplete boot from error output', () => {
      const completed: boolean = parseBootStatus('error: no devices/emulators found' as Str);
      expect(completed).toBe(false);
    });
  });
});
