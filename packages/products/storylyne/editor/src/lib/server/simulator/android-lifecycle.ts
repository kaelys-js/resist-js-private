/**
 * Android Emulator Lifecycle Management
 *
 * Manages Android emulator processes: booting AVDs, waiting for boot
 * completion via `getprop`, and graceful shutdown via `emu kill`.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import { type ChildProcess, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A running emulator instance. */
export type EmulatorInstance = {
  /** AVD name. */
  avdName: Str;
  /** Serial identifier (e.g. 'emulator-5554'). */
  serial: Str;
  /** Spawned emulator process. */
  process: ChildProcess;
};

/* ------------------------------------------------------------------ */
/*  Launch arguments                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build command-line arguments for launching an emulator AVD.
 *
 * Uses headless mode (`-no-window`) for screenshot capture, disables
 * audio, and uses SwiftShader for GPU emulation (compatible with CI).
 *
 * @param {Str} avdName - AVD name to launch
 * @returns {Str[]} Array of CLI arguments
 *
 * @example
 * const args = buildEmulatorArgs('Pixel_9_API_35');
 * // ['-avd', 'Pixel_9_API_35', '-no-window', '-no-audio', '-gpu', 'swiftshader_indirect']
 */
export function buildEmulatorArgs(avdName: Str): Str[] {
  return [
    '-avd',
    avdName,
    '-no-window',
    '-no-audio',
    '-gpu',
    'swiftshader_indirect',
    '-no-boot-anim',
  ] as Str[];
}

/* ------------------------------------------------------------------ */
/*  Boot detection                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse the output of `adb shell getprop sys.boot_completed`.
 *
 * Returns `true` only when the property value is exactly `'1'`.
 *
 * @param {Str} output - Raw stdout from the getprop command
 * @returns {boolean} Whether boot is completed
 *
 * @example
 * const done = parseBootStatus('1');
 * // true
 */
export function parseBootStatus(output: Str): boolean {
  return (output as string).trim() === '1';
}

/**
 * Delay 2 seconds between boot status polls.
 *
 * @returns Promise that resolves after 2s
 */
function bootPollDelay(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 2000);
  });
}

/**
 * Wait for an emulator to finish booting by polling `sys.boot_completed`.
 *
 * @param {Str} adbPath - Path to `adb` binary
 * @param {Str} serial - Emulator serial (e.g. 'emulator-5554')
 * @param {Num} timeoutMs - Maximum wait time (default: 120_000ms)
 * @returns {Promise<Bool>} `true` when boot completes, `false` on timeout
 *
 * @example
 * const booted = await waitForBoot('/path/to/adb', 'emulator-5554');
 */
export async function waitForBoot(
  adbPath: Str,
  serial: Str,
  timeoutMs: Num = 120_000 as Num,
): Promise<Bool> {
  const deadline: Num = (Date.now() + (timeoutMs as number)) as Num;

  /**
   * Check boot status once.
   *
   * @returns true if booted, false otherwise
   */
  async function checkOnce(): Promise<Bool> {
    try {
      const { stdout } = await execFileAsync(adbPath as string, [
        '-s',
        serial as string,
        'shell',
        'getprop',
        'sys.boot_completed',
      ]);
      return parseBootStatus(stdout as Str) as Bool;
    } catch {
      /* Device not yet reachable */
      return false as Bool;
    }
  }

  /* Initial check */
  const initialCheck: Bool = await checkOnce();
  if (initialCheck) {
    return true as Bool;
  }

  /* Poll with recursive async calls — each iteration awaits delay + check */
  return pollBoot(checkOnce, bootPollDelay, deadline);
}

/**
 * Recursively poll boot status until ready or deadline.
 *
 * @param check - Function to check if boot is complete
 * @param delay - Function that returns a 2s delay promise
 * @param deadline - Timestamp deadline
 * @returns true if booted, false on timeout
 */
async function pollBoot(
  check: () => Promise<Bool>,
  delay: () => Promise<void>,
  deadline: Num,
): Promise<Bool> {
  if (Date.now() >= (deadline as number)) {
    return false as Bool;
  }

  await delay();

  const ready: Bool = await check();
  if (ready) {
    return true as Bool;
  }

  return pollBoot(check, delay, deadline);
}

/* ------------------------------------------------------------------ */
/*  Process management                                                 */
/* ------------------------------------------------------------------ */

/**
 * Start an Android emulator process.
 *
 * Spawns the emulator in headless mode and returns immediately.
 * Use `waitForBoot()` to wait for the boot to complete.
 *
 * @param {Str} emulatorPath - Path to the `emulator` binary
 * @param {Str} avdName - AVD name to boot
 * @param {Str} serial - Expected serial (e.g. 'emulator-5554')
 * @returns {EmulatorInstance} The running emulator instance
 *
 * @example
 * const instance = startEmulator('/path/to/emulator', 'Pixel_9_API_35', 'emulator-5554');
 */
export function startEmulator(emulatorPath: Str, avdName: Str, serial: Str): EmulatorInstance {
  const args: Str[] = buildEmulatorArgs(avdName);
  const proc: ChildProcess = spawn(emulatorPath as string, args as string[], {
    stdio: 'ignore',
    detached: false,
  });

  return {
    avdName,
    serial,
    process: proc,
  };
}

/**
 * Shut down an emulator via `adb emu kill`.
 *
 * @param {Str} adbPath - Path to `adb` binary
 * @param {Str} serial - Emulator serial to kill
 *
 * @example
 * await shutdownEmulator('/path/to/adb', 'emulator-5554');
 */
export async function shutdownEmulator(adbPath: Str, serial: Str): Promise<void> {
  try {
    await execFileAsync(adbPath as string, ['-s', serial as string, 'emu', 'kill']);
  } catch {
    /* Emulator may already be stopped */
  }
}

/**
 * Kill an emulator by terminating its process directly.
 *
 * Falls back to SIGTERM if `emu kill` is not responsive.
 *
 * @param {EmulatorInstance} instance - The emulator instance to kill
 */
export function killEmulatorProcess(instance: EmulatorInstance): void {
  if (instance.process && instance.process.exitCode === null) {
    instance.process.kill('SIGTERM');
  }
}
