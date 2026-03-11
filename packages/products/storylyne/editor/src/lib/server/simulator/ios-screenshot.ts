/**
 * iOS Simulator Screenshot Capture — `xcrun simctl io screenshot`
 *
 * Captures PNG screenshots from a running iOS Simulator with proper
 * device mask rendering (notch, Dynamic Island, home indicator).
 * Returns raw PNG buffer for base64 encoding.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Capture a screenshot from a booted iOS Simulator.
 *
 * Uses `xcrun simctl io <udid> screenshot --type=png --mask=alpha`
 * to capture the screen with proper device mask rendering. The mask
 * preserves notch geometry, Dynamic Island, and home indicator as
 * transparent regions in the PNG.
 *
 * @param udid - Device UDID (must be booted)
 * @returns PNG image as a Buffer
 * @throws If the device is not booted or screenshot fails
 *
 * @example
 * const png: Buffer = await captureSimulatorScreenshot('B33CE7D0-...');
 * const base64: string = png.toString('base64');
 */
export async function captureSimulatorScreenshot(udid: Str): Promise<Buffer> {
  /* Write to temp file — simctl screenshot doesn't support stdout pipe */
  const tempPath: Str = join(tmpdir(), `lens-sim-${udid}-${Date.now()}.png`) as Str;

  try {
    await execFileAsync('xcrun', [
      'simctl',
      'io',
      udid,
      'screenshot',
      '--type=png',
      '--mask=alpha',
      tempPath,
    ]);

    /* Read the captured image into a Buffer */
    const buffer: Buffer = await readFile(tempPath);
    return buffer;
  } finally {
    /* Clean up temp file regardless of success/failure */
    try {
      await unlink(tempPath);
    } catch {
      /* Temp file cleanup is best-effort — file may not exist if screenshot failed */
    }
  }
}
