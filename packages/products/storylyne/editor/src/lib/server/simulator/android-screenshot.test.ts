/**
 * Tests for Android Emulator screenshot capture.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { buildScreencapArgs } from './android-screenshot';

describe('android-screenshot', () => {
  describe('buildScreencapArgs', () => {
    it('builds adb exec-out screencap args', () => {
      const args: Str[] = buildScreencapArgs('emulator-5554' as Str);
      expect(args).toContain('-s');
      expect(args).toContain('emulator-5554');
      expect(args).toContain('exec-out');
      expect(args).toContain('screencap');
      expect(args).toContain('-p');
    });
  });
});
