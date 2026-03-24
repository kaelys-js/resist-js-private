/**
 * iOS Simulator Live View capture pool.
 *
 * Pre-spawns parallel `xcrun simctl io screenshot` processes in
 * round-robin to achieve 15-25 FPS frame capture. While one
 * process writes to disk + reads, the next is already capturing.
 *
 * Uses JPEG output (not PNG) for faster encoding and smaller
 * file size, suitable for streaming over WebSocket.
 *
 * @module
 */

import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Num, Str } from '@/schemas/common';
import { log } from '@/utils/core/logger';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Default number of parallel capture processes. */
export const DEFAULT_POOL_SIZE: Num = 3 as Num;

/** Default target FPS for the capture loop. */
export const DEFAULT_TARGET_FPS: Num = 20 as Num;

/* ------------------------------------------------------------------ */
/*  Capture pool                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parallel simctl screenshot capture pool for iOS Simulator Live View.
 *
 * Runs a tight loop that captures JPEG screenshots from a booted
 * iOS Simulator via `xcrun simctl io`, reads the file, and delivers
 * the buffer to a callback. Multiple capture "slots" run in parallel
 * round-robin to overlap I/O and maximize throughput.
 *
 * @example
 * const pool = new IosPreviewCapturePool('B33CE7D0-...');
 * pool.start((jpeg) => ws.send(jpeg), 60);
 * // ... frames stream at ~20 FPS ...
 * pool.stop();
 */
export class IosPreviewCapturePool {
  /** iOS Simulator UDID. */
  readonly udid: Str;

  /** Number of parallel capture slots. */
  readonly poolSize: Num;

  /** Whether the capture loop is running. */
  private running: boolean = false;

  /** Total frames captured since last start. */
  private frames: Num = 0 as Num;

  /** Target FPS (controls interval between round-robin dispatches). */
  private targetFps: Num = DEFAULT_TARGET_FPS;

  /** Timer ID for the capture dispatch loop. */
  private timerId: ReturnType<typeof setTimeout> | undefined;

  /** Round-robin slot index. */
  private slotIndex: Num = 0 as Num;

  /** Monotonic counter for unique temp file names. */
  private captureId: Num = 0 as Num;

  /** Callback invoked with each JPEG frame buffer. */
  private onFrame: ((jpeg: Buffer) => void) | undefined;

  /** JPEG quality (not directly supported by simctl — unused for now). */
  private quality: Num = 60 as Num;

  /**
   * Create a new iOS capture pool.
   *
   * @param udid - Device UDID (must be booted)
   * @param size - Number of parallel capture slots (default: 3)
   */
  constructor(udid: Str, size: Num = DEFAULT_POOL_SIZE) {
    this.udid = udid;
    this.poolSize = size;
  }

  /**
   * Whether the capture loop is currently running.
   *
   * @returns True if streaming frames
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Total frames captured since last start.
   *
   * @returns Frame count
   */
  get frameCount(): Num {
    return this.frames;
  }

  /**
   * Start the capture loop.
   *
   * @param onFrame - Callback invoked with each JPEG buffer
   * @param quality - JPEG quality hint (0-100)
   */
  start(onFrame: (jpeg: Buffer) => void, quality: Num): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.frames = 0 as Num;
    this.slotIndex = 0 as Num;
    this.onFrame = onFrame;
    this.quality = quality;

    this.scheduleNextCapture();
  }

  /**
   * Stop the capture loop.
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.timerId !== undefined) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }

  /**
   * Adjust the target FPS for the capture loop.
   *
   * Can be called while running — takes effect on the next frame.
   *
   * @param fps - Target frames per second
   */
  adjustTargetFps(fps: Num): void {
    this.targetFps = fps;
  }

  /**
   * Schedule the next frame capture after the interval.
   */
  private scheduleNextCapture(): void {
    if (!this.running) {
      return;
    }

    const intervalMs: Num = Math.round(1000 / (this.targetFps as number)) as Num;
    this.timerId = setTimeout(async (): Promise<void> => {
      await this.captureFrame();
    }, intervalMs as number);
  }

  /**
   * Capture a single frame: simctl screenshot → read file → callback.
   *
   * Each capture gets a unique temp file path to avoid collisions
   * when multiple slots are in-flight.
   */
  private async captureFrame(): Promise<void> {
    if (!this.running) {
      return;
    }

    const captureNum: Num = this.captureId;
    this.captureId = ((this.captureId as number) + 1) as Num;

    /* Advance round-robin slot (unused in the scheduling but tracks parallelism) */
    this.slotIndex = (((this.slotIndex as number) + 1) % (this.poolSize as number)) as Num;

    /* Schedule next capture immediately (overlapping I/O) */
    this.scheduleNextCapture();

    const tempPath: Str = join(tmpdir(), `lens-ios-lv-${this.udid}-${captureNum}.jpeg`) as Str;

    try {
      await execFileAsync('xcrun', [
        'simctl',
        'io',
        this.udid,
        'screenshot',
        '--type=jpeg',
        tempPath,
      ]);

      const jpeg: Buffer = await readFile(tempPath);

      if (this.running && this.onFrame) {
        this.onFrame(jpeg);
        this.frames = ((this.frames as number) + 1) as Num;
      }
    } catch (error: unknown) {
      /* Screenshot may fail transiently (simulator busy, restarting) — non-critical */
      log.debug('iOS capture pool: screenshot failed', {
        error: error instanceof Error ? error.message : 'unknown',
        captureId: captureNum,
      });
    } finally {
      try {
        await unlink(tempPath);
      } catch {
        /* Temp file cleanup is best-effort — file may not exist if capture failed */
      }
    }
  }
}
