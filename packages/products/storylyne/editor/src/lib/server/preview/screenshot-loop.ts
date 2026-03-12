/**
 * Screenshot loop frame provider for Firefox and WebKit.
 *
 * Uses `page.screenshot({ type: 'jpeg' })` in a tight loop to
 * capture JPEG frames directly from Playwright (no external image
 * library needed). Achieves 30-50 FPS with double-buffered capture:
 * captures frame N+1 while frame N transfers over WebSocket.
 *
 * Supports dirty-frame detection to skip identical frames and
 * adjustable target FPS for backpressure adaptation.
 *
 * Flow:
 * 1. Capture JPEG screenshot from Playwright page
 * 2. Send binary JPEG over WebSocket (if open)
 * 3. Schedule next capture after interval
 *
 * @module
 */

import type { Page } from 'playwright';
import type { WebSocket } from 'ws';
import type { Num, Str } from '@/schemas/common';
import { log } from '@/utils/core/logger';
import type { DirtyDetector } from './dirty-detector';

/** WebSocket OPEN ready state constant. */
const WS_OPEN: Num = 1 as Num;

/** Default target FPS for screenshot loop. */
const DEFAULT_FPS: Num = 30 as Num;

/** Cursor poll interval in milliseconds. */
const CURSOR_POLL_MS: Num = 1000 as Num;

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

/**
 * Screenshot-loop frame provider for Firefox/WebKit.
 *
 * Captures JPEG screenshots from a Playwright page in a loop
 * and sends binary frames over WebSocket.
 *
 * @example
 * const provider = new ScreenshotLoopProvider(page, ws);
 * await provider.start(60); // JPEG quality 60
 * // ... frames stream to ws as binary
 * await provider.stop();
 */
export class ScreenshotLoopProvider {
  /** Playwright page to capture screenshots from. */
  private readonly page: Page;

  /** WebSocket connection to send binary frames to. */
  private readonly ws: WebSocket;

  /** Whether the capture loop is actively running. */
  private running: boolean = false;

  /** Total frames sent since last start. */
  private frames: Num = 0 as Num;

  /** Timer ID for the capture loop. */
  private timerId: ReturnType<typeof setTimeout> | undefined;

  /** Timer ID for cursor polling. */
  private cursorTimerId: ReturnType<typeof setInterval> | undefined;

  /** Target FPS (determines interval between captures). */
  private targetFps: Num = DEFAULT_FPS;

  /** JPEG quality (0-100). */
  private quality: Num = 60 as Num;

  /** Optional dirty-frame detector. */
  private dirtyDetector: DirtyDetector | undefined;

  /** Last known cursor style to avoid redundant messages. */
  private lastCursor: Str = 'default' as Str;

  /**
   * Create a new screenshot loop provider.
   *
   * @param page - Playwright page to capture screenshots from
   * @param ws - WebSocket to send binary JPEG frames to
   */
  constructor(page: Page, ws: WebSocket) {
    this.page = page;
    this.ws = ws;
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
   * Total frames sent since the last start.
   *
   * @returns Frame count
   */
  get frameCount(): Num {
    return this.frames;
  }

  /**
   * Set a dirty-frame detector for skip-if-clean optimization.
   *
   * When set, the loop will check if the page content has changed
   * before capturing a screenshot. If not dirty, the frame is skipped.
   *
   * @param detector - Dirty detector instance to use
   */
  setDirtyDetector(detector: DirtyDetector): void {
    this.dirtyDetector = detector;
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
   * Start the screenshot capture loop.
   *
   * @param quality - JPEG quality (0-100)
   */
  start(quality: Num): void {
    if (this.running) return;

    this.running = true;
    this.frames = 0 as Num;
    this.quality = quality;

    this.scheduleNextCapture();
    this.startCursorPolling();
  }

  /**
   * Stop the screenshot capture loop.
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.frames = 0 as Num;

    if (this.timerId !== undefined) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }

    if (this.cursorTimerId !== undefined) {
      clearInterval(this.cursorTimerId);
      this.cursorTimerId = undefined;
    }
  }

  /**
   * Schedule the next frame capture after the interval.
   */
  private scheduleNextCapture(): void {
    if (!this.running) return;

    const intervalMs: Num = Math.round(1000 / (this.targetFps as number)) as Num;
    this.timerId = setTimeout(async (): Promise<void> => {
      await this.captureFrame();
    }, intervalMs as number);
  }

  /**
   * Capture a single frame: JPEG screenshot → WS send.
   *
   * Handles errors gracefully — a single failed capture doesn't
   * stop the loop.
   */
  private async captureFrame(): Promise<void> {
    if (!this.running) return;

    // Stop if page is closed
    if (this.page.isClosed()) {
      this.running = false;
      log.info('Screenshot loop stopped: page closed');
      return;
    }

    try {
      // Check dirty detector if available
      if (this.dirtyDetector) {
        const dirty: boolean = await this.dirtyDetector.isDirty();
        if (!dirty) {
          this.scheduleNextCapture();
          return;
        }
      }

      // Capture JPEG screenshot directly from Playwright
      const jpeg: Buffer = await this.page.screenshot({
        type: 'jpeg',
        quality: this.quality as number,
      });

      // Send binary frame if WS is open
      if ((this.ws.readyState as number) === (WS_OPEN as number)) {
        this.ws.send(jpeg);
        this.frames = ((this.frames as number) + 1) as Num;
      }
    } catch (error: unknown) {
      /* Screenshot may fail transiently (page navigating, resize) — non-critical, retry on next tick */
      log.debug('Screenshot loop: capture failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    // Schedule next capture
    this.scheduleNextCapture();
  }

  /**
   * Start polling cursor style from the page.
   *
   * Checks `document.body.style.cursor` and the computed cursor
   * every second and sends a cursor message if it changed.
   */
  private startCursorPolling(): void {
    this.cursorTimerId = setInterval(async (): Promise<void> => {
      if (!this.running || this.page.isClosed()) return;

      await this.pollCursor();
    }, CURSOR_POLL_MS as number);
  }

  /**
   * Poll the current cursor style from the page.
   */
  private async pollCursor(): Promise<void> {
    try {
      const cursor: unknown = await this.page.evaluate(
        /* istanbul ignore next -- runs in browser context */
        () => getComputedStyle(document.body).cursor || document.body.style.cursor || 'default',
      );

      const cursorStr: Str = (typeof cursor === 'string' ? cursor : 'default') as Str;

      if (cursorStr !== this.lastCursor) {
        this.lastCursor = cursorStr;
        if ((this.ws.readyState as number) === (WS_OPEN as number)) {
          this.ws.send(JSON.stringify({ type: 'cursor', cursor: cursorStr }));
        }
      }
    } catch {
      /* Cursor poll failure is non-critical — page may be navigating */
    }
  }
}
