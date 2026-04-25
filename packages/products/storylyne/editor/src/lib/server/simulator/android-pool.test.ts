/**
 * Tests for Android Emulator pool management.
 *
 * @module
 */

import type { Bool, Num, Str, Void } from '@/schemas/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { EmulatorInstance } from './android-lifecycle';

/* Mock android-lifecycle so the pool module never spawns a real emulator. */
const _bootResult = { value: true as Bool };
const startCalls: Array<{ avdName: Str; serial: Str }> = [];
const killedSerials: Str[] = [];
const shutdownSerials: Str[] = [];

vi.mock('./android-lifecycle', () => ({
  startEmulator: vi.fn((_emulatorPath: Str, avdName: Str, serial: Str): EmulatorInstance => {
    startCalls.push({ avdName, serial });
    return {
      serial,
      avdName,
      process: { pid: 1234 },
    } as unknown as EmulatorInstance;
  }),
  waitForBoot: vi.fn(async (_adbPath: Str, _serial: Str): Promise<Bool> => _bootResult.value),
  killEmulatorProcess: vi.fn((instance: EmulatorInstance): Void => {
    killedSerials.push(instance.serial);
    return undefined;
  }),
  shutdownEmulator: vi.fn(async (_adbPath: Str, serial: Str): Promise<Void> => {
    shutdownSerials.push(serial);
    return undefined;
  }),
}));

import {
  acquireEmulator,
  assignSerial,
  releaseEmulator,
  getPoolSize,
  shutdownPool,
} from './android-pool';

beforeEach(async (): Promise<void> => {
  await shutdownPool('/fake/adb');
  startCalls.length = 0;
  killedSerials.length = 0;
  shutdownSerials.length = 0;
  _bootResult.value = true as Bool;
});

describe('android-pool', () => {
  describe('assignSerial', () => {
    it('assigns sequential serials starting from emulator-5554', () => {
      const serial0: Str = assignSerial(0 as Num);
      expect(serial0).toBe('emulator-5554');
    });

    it('assigns next serial for index 1', () => {
      const serial1: Str = assignSerial(1 as Num);
      expect(serial1).toBe('emulator-5556');
    });

    it('assigns correct serial for index 2', () => {
      const serial2: Str = assignSerial(2 as Num);
      expect(serial2).toBe('emulator-5558');
    });
  });

  describe('releaseEmulator', () => {
    it('does nothing for unknown AVD name', () => {
      releaseEmulator('unknown-avd-xyz');
      expect(getPoolSize()).toBe(0);
    });
  });

  describe('getPoolSize', () => {
    it('returns 0 when pool is empty', () => {
      expect(getPoolSize()).toBe(0);
    });
  });

  describe('acquireEmulator', () => {
    it('boots a new emulator, adds it to the pool, and returns the instance', async (): Promise<void> => {
      const inst = await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      expect(inst).not.toBeNull();
      expect(inst?.serial).toBe('emulator-5554');
      expect(startCalls).toEqual([{ avdName: 'Pixel_9', serial: 'emulator-5554' }]);
      expect(getPoolSize()).toBe(1);
    });

    it('returns the existing instance when re-acquiring a released slot', async (): Promise<void> => {
      const first = await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      releaseEmulator('Pixel_9');
      startCalls.length = 0;
      const second = await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      expect(second).toBe(first);
      expect(startCalls).toEqual([]);
      expect(getPoolSize()).toBe(1);
    });

    it('assigns sequential serials for distinct AVDs', async (): Promise<void> => {
      await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_10');
      expect(startCalls.map((c) => c.serial)).toEqual(['emulator-5554', 'emulator-5556']);
      expect(getPoolSize()).toBe(2);
    });

    it('returns null and cleans up the slot when waitForBoot fails', async (): Promise<void> => {
      _bootResult.value = false as Bool;
      const inst = await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_BAD');
      expect(inst).toBeNull();
      expect(killedSerials).toEqual(['emulator-5554']);
      expect(getPoolSize()).toBe(0);
    });
  });

  describe('releaseEmulator', () => {
    it('marks an existing slot as not in use', async (): Promise<void> => {
      await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      releaseEmulator('Pixel_9');
      /* Re-acquiring must reuse the slot — proves inUse was set false. */
      startCalls.length = 0;
      const second = await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      expect(second).not.toBeNull();
      expect(startCalls).toEqual([]);
    });
  });

  describe('shutdownPool', () => {
    it('shuts down every emulator in the pool and clears state', async (): Promise<void> => {
      await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_9');
      await acquireEmulator('/fake/emu', '/fake/adb', 'Pixel_10');
      await shutdownPool('/fake/adb');
      expect(shutdownSerials.sort()).toEqual(['emulator-5554', 'emulator-5556']);
      expect(killedSerials.sort()).toEqual(['emulator-5554', 'emulator-5556']);
      expect(getPoolSize()).toBe(0);
    });

    it('is a noop when pool is empty', async (): Promise<void> => {
      await shutdownPool('/fake/adb');
      expect(shutdownSerials).toEqual([]);
      expect(killedSerials).toEqual([]);
    });
  });
});
