/**
 * Tests for Android Emulator accessibility settings.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AndroidAccessibilitySettings,
  buildAccessibilityCommands,
  parseAccessibilityParams,
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

  describe('parseAccessibilityParams', () => {
    it('returns empty object when no params are present', () => {
      expect(parseAccessibilityParams(new URLSearchParams(''))).toEqual({});
    });

    it('accepts nightMode=yes and nightMode=no', () => {
      expect(parseAccessibilityParams(new URLSearchParams('nightMode=yes')).nightMode).toBe('yes');
      expect(parseAccessibilityParams(new URLSearchParams('nightMode=no')).nightMode).toBe('no');
    });

    it('ignores unknown nightMode values', () => {
      expect(
        parseAccessibilityParams(new URLSearchParams('nightMode=maybe')).nightMode,
      ).toBeUndefined();
    });

    it('passes through non-empty string params', () => {
      const s = parseAccessibilityParams(
        new URLSearchParams('fontScale=1.5&displayDensity=480&animationScale=0'),
      );
      expect(s.fontScale).toBe('1.5');
      expect(s.displayDensity).toBe('480');
      expect(s.animationScale).toBe('0');
    });
  });

  describe('applyAccessibilitySettings (mocked)', () => {
    const state = vi.hoisted(() => ({
      calls: [] as string[][],
      reject: new Set<number>(),
    }));
    vi.mock('node:child_process', () => ({
      default: {
        execFile: (
          _f: string,
          args: readonly string[],
          cb: (e: Error | null, r?: { stdout: string; stderr: string }) => void,
        ) => {
          state.calls.push([...args]);
          if (state.reject.has(state.calls.length - 1)) {
            cb(new Error('x'));
          } else {
            cb(null, { stdout: '', stderr: '' });
          }
          return null;
        },
      },
      execFile: (
        _f: string,
        args: readonly string[],
        cb: (e: Error | null, r?: { stdout: string; stderr: string }) => void,
      ) => {
        state.calls.push([...args]);
        if (state.reject.has(state.calls.length - 1)) {
          cb(new Error('x'));
        } else {
          cb(null, { stdout: '', stderr: '' });
        }
        return null;
      },
    }));
    beforeEach(() => {
      state.calls = [];
      state.reject = new Set();
      vi.resetModules();
    });
    afterEach(() => {
      state.calls = [];
      state.reject = new Set();
    });

    it('returns early without execFile calls when no settings given', async () => {
      const mod = await import('./android-accessibility');
      await mod.applyAccessibilitySettings(adbPath, serial, {});
      expect(state.calls).toEqual([]);
    });

    it('runs each command via execFile with Promise.allSettled', async () => {
      const mod = await import('./android-accessibility');
      await mod.applyAccessibilitySettings(adbPath, serial, {
        nightMode: 'yes' as Str,
        fontScale: '1.5' as Str,
        displayDensity: '480' as Str,
        animationScale: '0' as Str,
      });
      expect(state.calls).toHaveLength(4);
    });

    it('silently swallows individual execFile failures', async () => {
      state.reject = new Set([1]);
      const mod = await import('./android-accessibility');
      await expect(
        mod.applyAccessibilitySettings(adbPath, serial, {
          nightMode: 'yes' as Str,
          fontScale: '1.5' as Str,
        }),
      ).resolves.toBeUndefined();
      expect(state.calls).toHaveLength(2);
    });
  });
});
