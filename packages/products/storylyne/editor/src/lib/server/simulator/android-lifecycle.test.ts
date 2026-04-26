/**
 * Tests for Android Emulator lifecycle management.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { Num, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildEmulatorArgs, parseBootStatus } from './android-lifecycle';
import type * as AndroidLifecycleModule from './android-lifecycle';

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

  describe('waitForBoot / shutdownEmulator / startEmulator / killEmulatorProcess (mocked)', () => {
    class FakeChild extends EventEmitter {
      public killed = false;
      public signal: string | null = null;
      public exitCode: number | null = null;
      kill(sig?: string): void {
        this.signal = sig ?? null;
        this.killed = true;
      }
    }
    const state = vi.hoisted(() => ({
      execResponses: [] as Array<{ stdout?: string; error?: Error }>,
      spawned: null as FakeChild | null,
    }));
    vi.mock('node:child_process', () => ({
      default: {
        execFile: (
          _f: string,
          _a: readonly string[],
          cb: (e: Error | null, r?: { stdout: string; stderr: string }) => void,
        ) => {
          const next = state.execResponses.shift();
          if (!next) {
            cb(new Error('no exec response queued'));
          } else if (next.error) {
            cb(next.error);
          } else {
            cb(null, { stdout: next.stdout ?? '', stderr: '' });
          }
          return null;
        },
        spawn: () => state.spawned ?? new FakeChild(),
      },
      execFile: (
        _f: string,
        _a: readonly string[],
        cb: (e: Error | null, r?: { stdout: string; stderr: string }) => void,
      ) => {
        const next = state.execResponses.shift();
        if (!next) {
          cb(new Error('no exec response queued'));
        } else if (next.error) {
          cb(next.error);
        } else {
          cb(null, { stdout: next.stdout ?? '', stderr: '' });
        }
        return null;
      },
      spawn: () => state.spawned ?? new FakeChild(),
    }));

    beforeEach(() => {
      vi.useFakeTimers();
      state.execResponses = [];
      state.spawned = null;
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    async function load(): Promise<typeof AndroidLifecycleModule> {
      vi.resetModules();
      return await import('./android-lifecycle');
    }

    it('waitForBoot returns true on initial success', async () => {
      state.execResponses = [{ stdout: '1' }];
      const mod = await load();
      await expect(mod.waitForBoot('/adb' as Str, 'emulator-5554' as Str)).resolves.toBe(true);
    });

    it('waitForBoot polls until success', async () => {
      state.execResponses = [{ stdout: '' }, { stdout: '' }, { stdout: '1' }];
      const mod = await load();
      const p = mod.waitForBoot('/adb' as Str, 'emulator-5554' as Str, 10_000 as Num);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(p).resolves.toBe(true);
    });

    it('waitForBoot swallows exec errors while polling', async () => {
      state.execResponses = [{ error: new Error('offline') }, { stdout: '1' }];
      const mod = await load();
      const p = mod.waitForBoot('/adb' as Str, 'emulator-5554' as Str, 10_000 as Num);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(p).resolves.toBe(true);
    });

    it('waitForBoot returns false on deadline', async () => {
      /* Always-failing check */
      state.execResponses = Array.from({ length: 20 }, () => ({ stdout: '' }));
      const mod = await load();
      const p = mod.waitForBoot('/adb' as Str, 'emulator-5554' as Str, 1 as Num);
      await vi.advanceTimersByTimeAsync(2000);
      await expect(p).resolves.toBe(false);
    });

    it('shutdownEmulator swallows errors', async () => {
      state.execResponses = [{ error: new Error('gone') }];
      const mod = await load();
      await expect(
        mod.shutdownEmulator('/adb' as Str, 'emulator-5554' as Str),
      ).resolves.toBeUndefined();
    });

    it('shutdownEmulator resolves on success', async () => {
      state.execResponses = [{ stdout: 'ok' }];
      const mod = await load();
      await expect(
        mod.shutdownEmulator('/adb' as Str, 'emulator-5554' as Str),
      ).resolves.toBeUndefined();
    });

    it('startEmulator spawns process and returns instance', async () => {
      const child = new FakeChild();
      state.spawned = child;
      const mod = await load();
      const inst = mod.startEmulator(
        '/emu' as Str,
        'Pixel_9_API_35' as Str,
        'emulator-5554' as Str,
      );
      expect(inst.avdName).toBe('Pixel_9_API_35');
      expect(inst.serial).toBe('emulator-5554');
      expect(inst.process).toBe(child);
    });

    it('killEmulatorProcess kills when exitCode is null', async () => {
      const child = new FakeChild();
      state.spawned = child;
      const mod = await load();
      const inst = mod.startEmulator('/emu' as Str, 'A' as Str, 's' as Str);
      mod.killEmulatorProcess(inst);
      expect(child.killed).toBe(true);
      expect(child.signal).toBe('SIGTERM');
    });

    it('killEmulatorProcess is no-op when exitCode is set', async () => {
      const child = new FakeChild();
      child.exitCode = 0;
      state.spawned = child;
      const mod = await load();
      const inst = mod.startEmulator('/emu' as Str, 'A' as Str, 's' as Str);
      mod.killEmulatorProcess(inst);
      expect(child.killed).toBe(false);
    });
  });
});
