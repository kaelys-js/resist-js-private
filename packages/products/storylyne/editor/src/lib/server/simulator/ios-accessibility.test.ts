/**
 * Tests for iOS Simulator accessibility settings.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import { type IosAccessibilitySettings, buildAccessibilityCommands } from './ios-accessibility';

describe('ios-accessibility', () => {
  const udid: Str = 'TEST-UDID-1234' as Str;

  describe('buildAccessibilityCommands', () => {
    it('returns empty array when no settings specified', () => {
      const settings: IosAccessibilitySettings = {};
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toEqual([]);
    });

    it('returns appearance command for dark mode', () => {
      const settings: IosAccessibilitySettings = { appearance: 'dark' as Str };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual({
        args: ['simctl', 'ui', udid, 'appearance', 'dark'],
        description: 'Set appearance to dark',
      });
    });

    it('returns appearance command for light mode', () => {
      const settings: IosAccessibilitySettings = { appearance: 'light' as Str };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.args).toContain('light');
    });

    it('returns content size command when specified', () => {
      const settings: IosAccessibilitySettings = { contentSize: 'extra-large' as Str };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual({
        args: [
          'simctl',
          'spawn',
          udid,
          'notifyutil',
          '-s',
          'com.apple.UIKit.preferredContentSizeCategory',
          'UICTContentSizeCategoryXL',
        ],
        description: 'Set content size to extra-large',
      });
    });

    it('returns increase contrast command', () => {
      const settings: IosAccessibilitySettings = { increaseContrast: true };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Enable increase contrast');
    });

    it('returns reduce motion command', () => {
      const settings: IosAccessibilitySettings = { reduceMotion: true };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Enable reduce motion');
    });

    it('returns reduce transparency command', () => {
      const settings: IosAccessibilitySettings = { reduceTransparency: true };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(1);
      expect(commands[0]?.description).toBe('Enable reduce transparency');
    });

    it('returns multiple commands for multiple settings', () => {
      const settings: IosAccessibilitySettings = {
        appearance: 'dark' as Str,
        reduceMotion: true,
        increaseContrast: true,
      };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toHaveLength(3);
    });

    it('skips false boolean settings', () => {
      const settings: IosAccessibilitySettings = {
        reduceMotion: false,
        increaseContrast: false,
        reduceTransparency: false,
      };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands).toEqual([]);
    });
  });
});
