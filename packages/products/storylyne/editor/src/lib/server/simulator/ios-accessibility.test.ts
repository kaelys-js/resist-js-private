/**
 * Tests for iOS Simulator accessibility settings.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type IosAccessibilitySettings,
  buildAccessibilityCommands,
  parseAccessibilityParams,
} from './ios-accessibility';
import type * as NodeChildProcessModule from 'node:child_process';

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

    it('falls back to Large when contentSize is unknown', () => {
      const settings: IosAccessibilitySettings = { contentSize: 'bogus-size' as Str };
      const commands = buildAccessibilityCommands(udid, settings);
      expect(commands[0]?.args).toContain('UICTContentSizeCategoryL');
    });
  });

  describe('parseAccessibilityParams', () => {
    it('returns empty settings when no recognized params are present', () => {
      const params = new URLSearchParams('');
      expect(parseAccessibilityParams(params)).toEqual({});
    });

    it('accepts appearance=dark and appearance=light', () => {
      expect(parseAccessibilityParams(new URLSearchParams('appearance=dark')).appearance).toBe(
        'dark',
      );
      expect(parseAccessibilityParams(new URLSearchParams('appearance=light')).appearance).toBe(
        'light',
      );
    });

    it('ignores unknown appearance values', () => {
      const settings = parseAccessibilityParams(new URLSearchParams('appearance=auto'));
      expect(settings.appearance).toBeUndefined();
    });

    it('accepts a known contentSize value', () => {
      const settings = parseAccessibilityParams(
        new URLSearchParams('contentSize=accessibility-extra-large'),
      );
      expect(settings.contentSize).toBe('accessibility-extra-large');
    });

    it('ignores unknown contentSize values', () => {
      const settings = parseAccessibilityParams(new URLSearchParams('contentSize=not-real'));
      expect(settings.contentSize).toBeUndefined();
    });

    it('sets boolean flags only when the value is exactly "true"', () => {
      const settings = parseAccessibilityParams(
        new URLSearchParams('increaseContrast=true&reduceMotion=true&reduceTransparency=true'),
      );
      expect(settings.increaseContrast).toBe(true);
      expect(settings.reduceMotion).toBe(true);
      expect(settings.reduceTransparency).toBe(true);

      const no = parseAccessibilityParams(
        new URLSearchParams('increaseContrast=yes&reduceMotion=1&reduceTransparency=TRUE'),
      );
      expect(no.increaseContrast).toBeUndefined();
      expect(no.reduceMotion).toBeUndefined();
      expect(no.reduceTransparency).toBeUndefined();
    });
  });

  describe('applyAccessibilitySettings (mocked)', () => {
    const state = vi.hoisted(() => ({
      calls: [] as Str[][],
      rejectIndices: new Set<number>(),
    }));

    vi.mock('node:child_process', () => ({
      default: {
        execFile: (
          _file: string,
          args: readonly string[],
          cb: (err: Error | null, r?: { stdout: string; stderr: string }) => void,
        ) => {
          state.calls.push(args as Str[]);
          if (state.rejectIndices.has(state.calls.length - 1)) {
            cb(new Error('simctl failed'));
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
          return null as unknown as ReturnType<typeof NodeChildProcessModule.execFile>;
        },
      },
      execFile: (
        _file: string,
        args: readonly string[],
        cb: (err: Error | null, r?: { stdout: string; stderr: string }) => void,
      ) => {
        state.calls.push(args as Str[]);
        if (state.rejectIndices.has(state.calls.length - 1)) {
          cb(new Error('simctl failed'));
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
        return null as unknown as ReturnType<typeof NodeChildProcessModule.execFile>;
      },
    }));

    beforeEach(() => {
      state.calls = [];
      state.rejectIndices = new Set();
      vi.resetModules();
    });

    afterEach(() => {
      state.calls = [];
      state.rejectIndices = new Set();
    });

    it('returns 0 when no settings are specified (no commands executed)', async () => {
      const mod = await import('./ios-accessibility');
      const count = await mod.applyAccessibilitySettings(udid, {});
      expect(count).toBe(0);
      expect(state.calls).toEqual([]);
    });

    it('executes each command sequentially and counts fulfilled results', async () => {
      const mod = await import('./ios-accessibility');
      const count = await mod.applyAccessibilitySettings(udid, {
        appearance: 'dark' as Str,
        reduceMotion: true,
        increaseContrast: true,
      });
      expect(count).toBe(3);
      expect(state.calls).toHaveLength(3);
    });

    it('silently skips rejected results (best-effort)', async () => {
      state.rejectIndices = new Set([1]);
      const mod = await import('./ios-accessibility');
      const count = await mod.applyAccessibilitySettings(udid, {
        appearance: 'dark' as Str,
        reduceMotion: true,
        increaseContrast: true,
      });
      expect(count).toBe(2);
    });
  });
});
