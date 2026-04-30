/**
 * iOS Simulator Pool — Pre-booted Simulator Management
 *
 * Singleton pool that manages pre-booted iOS Simulator instances.
 * Keeps simulators warm across requests for fast screenshot capture
 * (~3s navigation + render vs ~30s+ cold boot).
 *
 * Uses the same module-level singleton pattern as the Playwright
 * `browserCache` Map in the screenshot API route.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import { bootSimulator, getDeviceState, shutdownSimulator, waitForBoot } from './ios-lifecycle';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A leased simulator device from the pool. */
export type PooledSimulator = {
  /** Device UDID. */
  udid: Str;
  /** Device name (e.g., 'iPhone 17 Pro'). */
  name: Str;
  /** Whether this pool entry was already booted (not cold-started by us). */
  wasPreBooted: Bool;
};

/** Pool entry tracking state. */
type PoolEntry = {
  /** Device UDID. */
  udid: Str;
  /** Device name. */
  name: Str;
  /** Whether currently leased to a request. */
  inUse: Bool;
  /** Whether we booted this device (vs. finding it already booted). */
  bootedByPool: Bool;
};

/* ------------------------------------------------------------------ */
/*  Singleton pool state                                               */
/* ------------------------------------------------------------------ */

/** Module-level pool entries — survives across requests. */
const poolEntries: Map<Str, PoolEntry> = new Map();

/** Maximum concurrent leases. */
const MAX_POOL_SIZE: Num = 3 as Num;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Acquire a simulator from the pool by UDID.
 *
 * If the simulator is already booted, returns immediately.
 * If not, boots the simulator and waits for it to be ready.
 *
 * @param {Str} udid - Device UDID to acquire
 * @param {Str} name - Human-readable device name for tracking
 * @returns {Promise<PooledSimulator>} Pooled simulator handle
 * @throws If pool is at capacity or boot fails
 *
 * @example
 * const sim = await acquireSimulator('B33CE7D0-...', 'iPhone 17 Pro');
 * // ... use the simulator ...
 * releaseSimulator(sim.udid);
 */
export async function acquireSimulator(udid: Str, name: Str): Promise<PooledSimulator> {
  /* Check if already in pool */
  const existing: PoolEntry | undefined = poolEntries.get(udid);
  if (existing) {
    if (existing.inUse) {
      throw new Error(`Simulator ${name} (${udid}) is already in use`);
    }
    existing.inUse = true as Bool;

    /* Verify it's still booted */
    const state: Str = await getDeviceState(udid);
    if (state !== 'Booted') {
      await bootSimulator(udid);
      await waitForBoot(udid);
    }

    return {
      udid,
      name,
      wasPreBooted: true as Bool,
    };
  }

  /* Check pool capacity */
  const inUseCount: Num = countInUse();
  if (inUseCount >= MAX_POOL_SIZE) {
    throw new Error(
      `Simulator pool is at maximum capacity (${MAX_POOL_SIZE}). Release a simulator first.`,
    );
  }

  /* Check if device is already booted externally */
  const currentState: Str = await getDeviceState(udid);
  const alreadyBooted: Bool = (currentState === 'Booted') as Bool;

  if (!alreadyBooted) {
    await bootSimulator(udid);
    await waitForBoot(udid);
  }

  /* Add to pool */
  const entry: PoolEntry = {
    udid,
    name,
    inUse: true as Bool,
    bootedByPool: !alreadyBooted as Bool,
  };
  poolEntries.set(udid, entry);

  return {
    udid,
    name,
    wasPreBooted: alreadyBooted,
  };
}

/**
 * Release a simulator back to the pool.
 *
 * The simulator remains booted for fast re-acquisition.
 * Does NOT shut down the simulator.
 *
 * @param {Str} udid - Device UDID to release
 */
export function releaseSimulator(udid: Str): void {
  const entry: PoolEntry | undefined = poolEntries.get(udid);
  if (entry) {
    entry.inUse = false as Bool;
  }
}

/**
 * Shutdown and remove a simulator from the pool.
 *
 * Only shuts down simulators that were booted by the pool,
 * not simulators that were found already running.
 *
 * @param {Str} udid - Device UDID to remove
 */
export async function removeFromPool(udid: Str): Promise<void> {
  const entry: PoolEntry | undefined = poolEntries.get(udid);
  if (!entry) {
    return;
  }

  if (entry.bootedByPool) {
    await shutdownSimulator(udid);
  }

  poolEntries.delete(udid);
}

/**
 * Get the current pool status.
 *
 * @returns {{
  total: Num;
  inUse: Num;
  devices: Array<{ udid: Str; name: Str; inUse: Bool }>;
}} Pool status with total entries, in-use count, and device list
 */
export function getPoolStatus(): {
  total: Num;
  inUse: Num;
  devices: Array<{ udid: Str; name: Str; inUse: Bool }>;
} {
  const devices: Array<{ udid: Str; name: Str; inUse: Bool }> = [];
  for (const entry of poolEntries.values()) {
    devices.push({
      udid: entry.udid,
      name: entry.name,
      inUse: entry.inUse,
    });
  }

  return {
    total: poolEntries.size as Num,
    inUse: countInUse(),
    devices,
  };
}

/**
 * Shutdown all pool-booted simulators and clear the pool.
 *
 * Called during cleanup/shutdown.
 */
export async function drainPool(): Promise<void> {
  const entries: PoolEntry[] = [...poolEntries.values()];
  poolEntries.clear();

  /* Shutdown all pool-booted simulators in parallel */
  const shutdownPromises: Array<Promise<void>> = entries
    .filter((entry: PoolEntry): boolean => entry.bootedByPool as boolean)
    .map(async (entry: PoolEntry): Promise<void> => {
      try {
        await shutdownSimulator(entry.udid);
      } catch {
        /* Best-effort cleanup — simulator may already be shut down */
      }
    });

  await Promise.all(shutdownPromises);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Count the number of currently leased simulators.
 *
 * @returns Number of in-use pool entries
 */
function countInUse(): Num {
  let count: Num = 0 as Num;
  for (const entry of poolEntries.values()) {
    if (entry.inUse) {
      count = (count + 1) as Num;
    }
  }
  return count;
}
