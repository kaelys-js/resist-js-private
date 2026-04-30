/**
 * Android Emulator Screenshot Capture
 *
 * Captures screenshots from the Android emulator using `adb exec-out screencap -p`,
 * which streams PNG data directly to stdout (no temp file needed). The PNG
 * bytes are then base64-encoded for the API response.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Command building                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build `adb exec-out screencap` arguments for PNG capture.
 *
 * Uses `exec-out` (not `shell`) to avoid LF→CRLF conversion that
 * corrupts binary data. The `-p` flag outputs PNG format.
 *
 * @param {Str} serial - Emulator serial (e.g. 'emulator-5554')
 * @returns {Str[]} Array of adb command arguments
 *
 * @example
 * const args = buildScreencapArgs('emulator-5554');
 * // ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p']
 */
export function buildScreencapArgs(serial: Str): Str[] {
  return ['-s', serial, 'exec-out', 'screencap', '-p'] as Str[];
}

/* ------------------------------------------------------------------ */
/*  Screenshot capture                                                 */
/* ------------------------------------------------------------------ */

/**
 * Capture a screenshot from the Android emulator.
 *
 * Runs `adb exec-out screencap -p` to stream PNG data from the device
 * and returns it as a base64-encoded string.
 *
 * @param {Str} adbPath - Path to `adb` binary
 * @param {Str} serial - Emulator serial (e.g. 'emulator-5554')
 * @returns {Promise<Str>} Base64-encoded PNG image data
 * @throws If screencap fails
 *
 * @example
 * const base64 = await captureEmulatorScreenshot('/path/to/adb', 'emulator-5554');
 */
export async function captureEmulatorScreenshot(adbPath: Str, serial: Str): Promise<Str> {
  const args: Str[] = buildScreencapArgs(serial);

  const { stdout } = await execFileAsync(adbPath as string, args as string[], {
    encoding: 'buffer',
    maxBuffer: 50 * 1024 * 1024 /* 50 MB — emulator screenshots can be large */,
  });

  /* stdout is a Buffer when encoding is 'buffer' */
  const pngBuffer: Buffer = stdout as unknown as Buffer;
  return pngBuffer.toString('base64') as Str;
}
