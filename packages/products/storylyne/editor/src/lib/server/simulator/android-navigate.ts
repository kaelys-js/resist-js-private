/**
 * Android Emulator URL Navigation
 *
 * Opens URLs in Chrome on the Android emulator via `adb shell am start`
 * and manages port forwarding for host access via `10.0.2.2`.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// =============================================================================
// URL rewriting
// =============================================================================

/**
 * Rewrite a localhost URL to use Android's host loopback IP (`10.0.2.2`).
 *
 * Android emulators cannot reach `localhost` or `127.0.0.1` on the host
 * machine directly. The special IP `10.0.2.2` is routed to the host's
 * loopback adapter.
 *
 * @param {Str} url - Original URL (may contain localhost or 127.0.0.1)
 * @returns {Str} URL with host replaced by 10.0.2.2 if applicable
 *
 * @example
 * rewriteUrlForEmulator('http://localhost:3100/isolate/button');
 * // 'http://10.0.2.2:3100/isolate/button'
 */
export function rewriteUrlForEmulator(url: Str): Str {
  return (url as string)
    .replaceAll('localhost', '10.0.2.2')
    .replaceAll('127.0.0.1', '10.0.2.2') as Str;
}

// =============================================================================
// ADB commands
// =============================================================================

/**
 * Build `adb shell am start` arguments to open a URL in Chrome.
 *
 * Uses the `VIEW` intent action to launch the default browser (Chrome)
 * with the specified URL.
 *
 * @param {Str} url - URL to open (should already be rewritten for emulator)
 * @returns {Str[]} Array of adb command arguments
 *
 * @example
 * const args = buildAmStartArgs('http://10.0.2.2:3100/isolate/button');
 * // ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url]
 */
export function buildAmStartArgs(url: Str): Str[] {
  return ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url] as Str[];
}

/**
 * Build `adb forward` arguments for port forwarding.
 *
 * Maps a host port to a device port so the emulator can reach the
 * dev server via `10.0.2.2`.
 *
 * @param {Num} hostPort - Port on the host machine
 * @param {Num} devicePort - Port on the emulator
 * @returns {Str[]} Array of adb forward arguments
 *
 * @example
 * const args = buildPortForwardArgs(3100, 3100);
 * // ['forward', 'tcp:3100', 'tcp:3100']
 */
export function buildPortForwardArgs(hostPort: Num, devicePort: Num): Str[] {
  return ['forward', `tcp:${hostPort}`, `tcp:${devicePort}`] as Str[];
}

/**
 * Open a URL in Chrome on the Android emulator.
 *
 * Rewrites localhost URLs to use `10.0.2.2` and launches Chrome
 * via an Android VIEW intent.
 *
 * @param {Str} adbPath - Path to `adb` binary
 * @param {Str} serial - Emulator serial (e.g. 'emulator-5554')
 * @param {Str} url - URL to open (localhost URLs are auto-rewritten)
 *
 * @example
 * await openUrlInEmulator('/path/to/adb', 'emulator-5554', 'http://localhost:3100/isolate/btn');
 */
export async function openUrlInEmulator(adbPath: Str, serial: Str, url: Str): Promise<void> {
  const emulatorUrl: Str = rewriteUrlForEmulator(url);
  const args: Str[] = ['-s', serial, ...buildAmStartArgs(emulatorUrl)] as Str[];

  await execFileAsync(adbPath as string, args as string[]);
}

/**
 * Set up port forwarding from emulator to host.
 *
 * @param {Str} adbPath - Path to `adb` binary
 * @param {Str} serial - Emulator serial
 * @param {Num} hostPort - Host port to forward
 * @param {Num} devicePort - Device port to map to
 *
 * @example
 * await setupPortForward('/path/to/adb', 'emulator-5554', 3100, 3100);
 */
export async function setupPortForward(
  adbPath: Str,
  serial: Str,
  hostPort: Num,
  devicePort: Num,
): Promise<void> {
  const args: Str[] = ['-s', serial, ...buildPortForwardArgs(hostPort, devicePort)] as Str[];

  await execFileAsync(adbPath as string, args as string[]);
}
