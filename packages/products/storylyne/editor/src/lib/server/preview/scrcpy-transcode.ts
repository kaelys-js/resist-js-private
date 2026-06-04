/**
 * H.264→JPEG transcode via ffmpeg subprocess.
 *
 * For browsers that don't support WebCodecs (e.g., Firefox),
 * this module pipes raw H.264 NAL units into ffmpeg and reads
 * JPEG frames from its stdout. This is a fallback — WebCodecs
 * decoding on the client is preferred when available.
 *
 * Protocol:
 * 1. Spawn ffmpeg with H.264 stdin input, MJPEG stdout output
 * 2. Write H.264 NAL units (Annex B format) to stdin
 * 3. Read JPEG frames from stdout via data events
 * 4. Kill process on stop
 *
 * @module
 */

import { type ChildProcess, execFile, spawn } from 'node:child_process';
import type { Num, Str } from '@/schemas/common';
import { log } from '@/utils/core/logger';

// =============================================================================
// Types
// =============================================================================

/** Options for creating an H.264→JPEG transcoder. */
export type TranscodeOptions = {
  /** Video width in pixels. */
  width: Num;
  /** Video height in pixels. */
  height: Num;
  /** JPEG quality (0-100, higher is better). */
  quality: Num;
};

/** Handle for a running ffmpeg transcode process. */
export type TranscodeHandle = {
  /** Process ID of the spawned ffmpeg process. */
  pid: Num;
  /** Write H.264 NAL unit data to ffmpeg stdin. */
  write: (data: Buffer) => void;
  /** Stop the ffmpeg process. */
  stop: () => void;
};

// =============================================================================
// ffmpeg detection
// =============================================================================

/**
 * Check if ffmpeg is available on the system PATH.
 *
 * @returns {Promise<boolean>} True if ffmpeg responds to `-version`
 */
export function isFfmpegAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve): void => {
    execFile('ffmpeg' as Str, ['-version'], { timeout: 5000 }, (err: Error | null): void => {
      resolve(err === null);
    });
  });
}

// =============================================================================
// Quality mapping
// =============================================================================

/**
 * Map quality 0-100 to ffmpeg MJPEG q:v parameter.
 *
 * ffmpeg uses q:v 1-31 where 1 is best quality and 31 is worst.
 * We invert: quality 100 → q:v 1, quality 0 → q:v 31.
 *
 * @param quality - Quality value 0-100
 * @returns ffmpeg q:v value 1-31
 */
function mapQuality(quality: Num): Num {
  const clamped: number = Math.max(0, Math.min(100, quality as number));
  // Linear map: 100 → 1, 0 → 31

  return Math.round(31 - (clamped / 100) * 30) as Num;
}

// =============================================================================
// Transcoder
// =============================================================================

/**
 * Create an ffmpeg transcoder that converts H.264 → JPEG.
 *
 * Spawns ffmpeg reading raw H.264 from stdin and writing MJPEG
 * frames to stdout. Each stdout data chunk is a JPEG frame.
 *
 * @param {TranscodeOptions} options - Transcode configuration (dimensions, quality)
 * @param {(jpeg: Buffer) => void} onFrame - Callback invoked with each JPEG frame buffer
 * @returns {TranscodeHandle} Handle for writing H.264 data and stopping the process
 */
export function createTranscoder(
  options: TranscodeOptions,
  onFrame: (jpeg: Buffer) => void,
): TranscodeHandle {
  const qv: Num = mapQuality(options.quality);

  const args: string[] = [
    // Input: raw H.264 from stdin
    '-f',
    'h264',
    '-i',
    'pipe:0',
    // Output: MJPEG frames to stdout
    '-f',
    'mjpeg',
    '-q:v',
    (qv as number).toString(),
    // One JPEG per input frame
    '-vsync',
    '0',
    // No audio
    '-an',
    // Output to stdout
    'pipe:1',
  ];

  const child: ChildProcess = spawn('ffmpeg' as Str, args);

  // Forward JPEG frames from stdout
  child.stdout?.on('data', (data: Buffer): void => {
    onFrame(data);
  });

  // Log stderr for debugging (ffmpeg writes progress/errors here)
  child.stderr?.on('data', (data: Buffer): void => {
    log.debug('ffmpeg transcode stderr', { output: data.toString().trim() });
  });

  // Log process exit
  child.on('exit', (code: number | null): void => {
    log.info('ffmpeg transcode exited', { code });
  });

  return {
    pid: (child.pid ?? 0) as Num,

    write(data: Buffer): void {
      child.stdin?.write(data);
    },

    stop(): void {
      child.stdin?.end();
      if (!child.killed) {
        child.kill();
      }
    },
  };
}
