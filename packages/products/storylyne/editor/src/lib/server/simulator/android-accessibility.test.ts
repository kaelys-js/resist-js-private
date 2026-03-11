/**
 * Tests for Android Emulator accessibility settings.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import {
  type AndroidAccessibilitySettings,
  buildAccessibilityCommands,
} from './android-accessibility';

describe('android-accessibility', () => {
  const serial: Str = 'emulator-5554' as Str;
  const adbPath: Str = '/path/to/adb' as Str;

  describe('buildAccessibilityCommands', () => {
    it('returns empty array when no settings specified', () => {
      const settings: AndroidAccessibilitySettings = {};
      const commands = buildAccessibilityCommands(adbPath, serial, settings);
      expect(commands).toEqual([]);
    });

    it('returns night mode command for dark mode', () => {
      const settings: AndroidAccessibilitySettings = { nightMode: 'yes' as Str };
      const commands = buildAccessibilityCommands(adbPath, serial, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Set dark mode to yes');
      expect(commands[0]?.args).toContain('cmd');
      expect(commands[0]?.args).toContain('uimode');
    });

    it('returns font scale command', () => {
      const settings: AndroidAccessibilitySettings = { fontScale: '1.5' as Str };
      const commands = buildAccessibilityCommands(adbPath, serial, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Set font scale to 1.5');
    });

    it('returns display density command', () => {
      const settings: AndroidAccessibilitySettings = { displayDensity: '480' as Str };
      const commands = buildAccessibilityCommands(adbPath, serial, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Set display density to 480');
    });

    it('returns animation scale command', () => {
      const settings: AndroidAccessibilitySettings = { animationScale: '0' as Str };
      const commands = buildAccessibilityCommands(adbPath, serial, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Set animation scale to 0');
    });

    it('returns multiple commands for multiple settings', () => {
      const settings: AndroidAccessibilitySettings = {
        nightMode: 'yes' as Str,
        fontScale: '2.0' as Str,
        animationScale: '0' as Str,
      };
      const commands = buildAccessibilityCommands(adbPath, serial, settings);
      expect(commands).toHaveLength(3);
    });
  });
});
