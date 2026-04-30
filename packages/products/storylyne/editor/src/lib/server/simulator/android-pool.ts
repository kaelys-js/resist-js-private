/**
 * Pre-Booted Android Emulator Pool
 *
 * Manages a singleton pool of pre-booted Android emulators for fast
 * screenshot capture. Each emulator is assigned a sequential serial
 * (`emulator-5554`, `emulator-5556`, etc.) and kept running between
 * requests with Quick Boot state.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import {
  type EmulatorInstance,
  killEmulatorProcess,
  shutdownEmulator,
  startEmulator,
  waitForBoot,
} from './android-lifecycle';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** An emulator slot in the pool. */
type PoolSlot = {
  /** The emulator instance (null if slot is empty). */
  instance: EmulatorInstance | null;
  /** Whether this slot is currently in use by a request. */
  inUse: Bool;
  /** AVD name assigned to this slot. */
  avdName: Str;
};

/* ------------------------------------------------------------------ */
/*  Serial assignment                                                  */
/* ------------------------------------------------------------------ */

/** Base port for emulator serials — Android uses even ports starting at 5554. */
const BASE_PORT: Num = 5554 as Num;

/**
 * Assign an emulator serial for a pool slot index.
 *
 * Android emulators use sequential even port numbers starting from 5554:
 * `emulator-5554`, `emulator-5556`, `emulator-5558`, etc.
 *
 * @param {Num} index - Pool slot index (0-based)
 * @returns {Str} Serial string (e.g. 'emulator-5554')
 *
 * @example
 * assignSerial(0); // 'emulator-5554'
 * assignSerial(1); // 'emulator-5556'
 */
export function assignSerial(index: Num): Str {
  const port: Num = ((BASE_PORT as number) + (index as number) * 2) as Num;
  return `emulator-${port}` as Str;
}

/* ------------------------------------------------------------------ */
/*  Pool singleton                                                     */
/* ------------------------------------------------------------------ */

/** The pool — keyed by AVD name. */
const pool: Map<string, PoolSlot> = new Map();

/**
 * Acquire an emulator from the pool.
 *
 * If an emulator with the requested AVD is already running and not in use,
 * it is returned immediately. Otherwise, a new emulator is booted.
 *
 * @param {Str} emulatorPath - Path to the `emulator` binary
 * @param {Str} adbPath - Path to the `adb` binary
 * @param {Str} avdName - AVD name to boot
 * @returns {Promise<EmulatorInstance | null>} The acquired emulator instance, or null if boot failed
 *
 * @example
 * const instance = await acquireEmulator('/path/to/emulator', '/path/to/adb', 'Pixel_9_API_35');
 */
export async function acquireEmulator(
  emulatorPath: Str,
  adbPath: Str,
  avdName: Str,
): Promise<EmulatorInstance | null> {
  /* Check for existing idle slot */
  const existing: PoolSlot | undefined = pool.get(avdName as string);
  if (existing?.instance && !existing.inUse) {
    existing.inUse = true as Bool;
    return existing.instance;
  }

  /* Assign a serial based on pool size */
  const index: Num = pool.size as Num;
  const serial: Str = assignSerial(index);

  /* Boot new emulator */
  const instance: EmulatorInstance = startEmulator(emulatorPath, avdName, serial);
  const slot: PoolSlot = {
    instance,
    inUse: true as Bool,
    avdName,
  };
  pool.set(avdName as string, slot);

  /* Wait for boot */
  const booted: Bool = await waitForBoot(adbPath, serial);
  if (!booted) {
    killEmulatorProcess(instance);
    pool.delete(avdName as string);
    return null;
  }

  return instance;
}

/**
 * Release an emulator back to the pool.
 *
 * The emulator keeps running for future requests (Quick Boot reuse).
 *
 * @param {Str} avdName - AVD name to release
 *
 * @example
 * releaseEmulator('Pixel_9_API_35');
 */
export function releaseEmulator(avdName: Str): void {
  const slot: PoolSlot | undefined = pool.get(avdName as string);
  if (slot) {
    slot.inUse = false as Bool;
  }
}

/**
 * Shut down all emulators in the pool and clear it.
 *
 * @param {Str} adbPath - Path to `adb` binary
 *
 * @example
 * await shutdownPool('/path/to/adb');
 */
export async function shutdownPool(adbPath: Str): Promise<void> {
  const shutdowns: Array<Promise<void>> = [];

  for (const [, slot] of pool) {
    if (slot.instance) {
      shutdowns.push(shutdownEmulator(adbPath, slot.instance.serial));
      killEmulatorProcess(slot.instance);
    }
  }

  await Promise.allSettled(shutdowns);
  pool.clear();
}

/**
 * Get the number of emulators currently in the pool.
 *
 * @returns {Num} Pool size
 */
export function getPoolSize(): Num {
  return pool.size as Num;
}
