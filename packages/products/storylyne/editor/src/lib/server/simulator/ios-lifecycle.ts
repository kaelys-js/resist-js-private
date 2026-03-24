/**
 * iOS Simulator Lifecycle — boot/shutdown management
 *
 * Provides idempotent boot and shutdown operations for iOS Simulator devices.
 * Handles exit code 149 (already booted) gracefully and includes configurable
 * wait polling for boot completion.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Exit code returned by `xcrun simctl boot` when device is already booted. */
const ALREADY_BOOTED_EXIT_CODE: Num = 149 as Num;

/** Default poll interval for boot wait (ms). */
const BOOT_POLL_INTERVAL_MS: Num = 500 as Num;

/** Default maximum wait time for boot completion (ms). */
const BOOT_TIMEOUT_MS: Num = 60_000 as Num;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Boot an iOS Simulator device by UDID.
 *
 * Idempotent — if the device is already booted (exit code 149),
 * this returns `true` without error.
 *
 * @param udid - Device UDID from `xcrun simctl list`
 * @returns `true` if device is now booted (or was already booted)
 * @throws If boot fails for a reason other than "already booted"
 *
 * @example
 * await bootSimulator('B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0');
 */
export async function bootSimulator(udid: Str): Promise<Bool> {
  try {
    await execFileAsync('xcrun', ['simctl', 'boot', udid]);
    return true as Bool;
  } catch (error: unknown) {
    /* Exit code 149 = already booted — not an error */
    const execError = error as { code?: Num };
    if (execError.code === ALREADY_BOOTED_EXIT_CODE) {
      return true as Bool;
    }
    throw error;
  }
}

/**
 * Wait for an iOS Simulator device to finish booting.
 *
 * Polls `xcrun simctl list devices --json` until the device reports
 * state 'Booted' or the timeout expires.
 *
 * @param udid - Device UDID to monitor
 * @param timeoutMs - Maximum wait time (default: 60000ms)
 * @returns `true` when device is booted
 * @throws If timeout expires before device boots
 */
export function waitForBoot(udid: Str, timeoutMs: Num = BOOT_TIMEOUT_MS): Promise<Bool> {
  const deadline: Num = (Date.now() + timeoutMs) as Num;

  /**
   * Recursive poll step — checks device state, waits, and recurses.
   *
   * @returns `true` when device reaches 'Booted' state
   */
  const poll = async (): Promise<Bool> => {
    if (Date.now() >= deadline) {
      throw new Error(`Simulator ${udid} did not boot within ${timeoutMs}ms`);
    }
    const state: Str = await getDeviceState(udid);
    if (state === 'Booted') {
      return true as Bool;
    }
    await sleep(BOOT_POLL_INTERVAL_MS);
    return poll();
  };

  return poll();
}

/**
 * Shutdown an iOS Simulator device by UDID.
 *
 * Idempotent — if the device is already shutdown, no error is thrown.
 *
 * @param udid - Device UDID
 * @returns `true` when device is shut down
 */
export async function shutdownSimulator(udid: Str): Promise<Bool> {
  try {
    await execFileAsync('xcrun', ['simctl', 'shutdown', udid]);
    return true as Bool;
  } catch {
    /* Already shutdown — not an error */
    return true as Bool;
  }
}

/**
 * Get the current state of a simulator device.
 *
 * @param udid - Device UDID
 * @returns Device state string ('Booted', 'Shutdown', 'Shutting Down')
 */
export async function getDeviceState(udid: Str): Promise<Str> {
  const { stdout } = await execFileAsync('xcrun', ['simctl', 'list', 'devices', '--json']);
  const parsed: Record<Str, unknown> = JSON.parse(stdout) as Record<Str, unknown>;
  const devicesMap: Record<Str, unknown[]> = (parsed.devices ?? {}) as Record<Str, unknown[]>;

  for (const devices of Object.values(devicesMap)) {
    for (const raw of devices) {
      const d: Record<Str, unknown> = raw as Record<Str, unknown>;
      if (d.udid === udid) {
        return (d.state ?? 'Shutdown') as Str;
      }
    }
  }

  return 'Shutdown' as Str;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Sleep for the specified duration.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
function sleep(ms: Num): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
