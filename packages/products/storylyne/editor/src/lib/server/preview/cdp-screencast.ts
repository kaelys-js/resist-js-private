/**
 * CDP Screencast frame provider for Chromium.
 *
 * Uses the Chrome DevTools Protocol `Page.startScreencast` API to
 * receive JPEG frames at 30-60 FPS. Only sends frames when the page
 * content changes (dirty-frame-only), with built-in backpressure via
 * the frame acknowledgement mechanism.
 *
 * Flow:
 * 1. Start screencast → CDP sends `Page.screencastFrame` events
 * 2. Decode base64 frame → send as binary WebSocket frame
 * 3. Acknowledge frame → CDP sends next dirty frame
 *
 * @module
 */

import type { CDPSession } from 'playwright';
import type { WebSocket } from 'ws';
import type { Num, Str } from '@/schemas/common';

/** WebSocket OPEN ready state constant. */
const WS_OPEN: Num = 1 as Num;

/** Cursor poll interval in milliseconds. */
const CURSOR_POLL_MS: Num = 1000 as Num;

/* ------------------------------------------------------------------ */
/*  CDP screencast frame event shape                                   */
/* ------------------------------------------------------------------ */

/** Shape of a CDP Page.screencastFrame event payload. */
type ScreencastFrameEvent = {
  /** Base64-encoded JPEG frame data. */
  data: string;
  /** Frame metadata (viewport dimensions, scale). */
  metadata: {
    /** CSS pixel ratio. */
    pageScaleFactor: number;
    /** Device viewport width. */
    deviceWidth: number;
    /** Device viewport height. */
    deviceHeight: number;
  };
  /** Session identifier for acknowledgement. */
  sessionId: number;
};

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

/**
 * CDP-based screencast frame provider for Chromium browsers.
 *
 * Manages the lifecycle of `Page.startScreencast` and handles
 * incoming frames by converting them to binary WebSocket messages.
 *
 * @example
 * const provider = new CdpScreencastProvider(cdpSession, ws);
 * await provider.start(60);
 * // ... frames stream to ws as binary
 * await provider.stop();
 */
export class CdpScreencastProvider {
  /** CDP session for sending commands and receiving events. */
  private readonly cdp: CDPSession;

  /** WebSocket connection to send binary frames to. */
  private readonly ws: WebSocket;

  /** Whether the screencast is actively running. */
  private running: boolean = false;

  /** Total frames received since last start. */
  private frames: Num = 0 as Num;

  /** Bound frame handler for cleanup on stop. */
  private frameHandler: ((params: unknown) => void) | undefined;

  /** Timer ID for cursor polling. */
  private cursorTimerId: ReturnType<typeof setInterval> | undefined;

  /** Last known cursor style to avoid redundant messages. */
  private lastCursor: Str = 'default' as Str;

  /**
   * Create a new CDP screencast provider.
   *
   * @param cdp - Playwright CDPSession (from `context.newCDPSession(page)`)
   * @param ws - WebSocket to send binary JPEG frames to
   */
  constructor(cdp: CDPSession, ws: WebSocket) {
    this.cdp = cdp;
    this.ws = ws;
  }

  /**
   * Whether the screencast is currently running.
   *
   * @returns True if streaming frames
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Total frames received since the last start.
   *
   * @returns Frame count
   */
  get frameCount(): Num {
    return this.frames;
  }

  /**
   * Start the CDP screencast.
   *
   * Sends `Page.startScreencast` with JPEG format and the specified
   * quality, then listens for `Page.screencastFrame` events.
   *
   * @param quality - JPEG quality (0-100)
   */
  async start(quality: Num): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.frames = 0 as Num;

    // Create bound handler for frame events
    this.frameHandler = (params: unknown): void => {
      this.handleFrame(params as ScreencastFrameEvent);
    };

    this.cdp.on('Page.screencastFrame', this.frameHandler);

    await this.cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: quality as number,
      everyNthFrame: 1,
    });

    this.startCursorPolling();
  }

  /**
   * Stop the CDP screencast.
   *
   * Sends `Page.stopScreencast` and removes the frame event listener.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.frames = 0 as Num;

    if (this.frameHandler) {
      this.cdp.off('Page.screencastFrame', this.frameHandler);
      this.frameHandler = undefined;
    }

    if (this.cursorTimerId !== undefined) {
      clearInterval(this.cursorTimerId);
      this.cursorTimerId = undefined;
    }

    await this.cdp.send('Page.stopScreencast');
  }

  /**
   * Handle an incoming screencast frame.
   *
   * Decodes the base64 JPEG data, sends it as a binary WebSocket
   * frame (if the WS is open), and acknowledges the frame to CDP
   * so the next dirty frame can be sent.
   *
   * @param event - CDP screencast frame event payload
   */
  private handleFrame(event: ScreencastFrameEvent): void {
    this.frames = ((this.frames as number) + 1) as Num;

    // Send binary frame to client if WS is open
    if ((this.ws.readyState as number) === (WS_OPEN as number)) {
      const buffer: Buffer = Buffer.from(event.data, 'base64');
      this.ws.send(buffer);
    }

    // Always acknowledge — this controls backpressure
    this.cdp.send('Page.screencastFrameAck', {
      sessionId: event.sessionId,
    });
  }

  /**
   * Start polling cursor style from the page via CDP.
   *
   * Uses `Runtime.evaluate` to read the computed cursor style
   * every second and sends a cursor message over WS if it changed.
   */
  private startCursorPolling(): void {
    this.cursorTimerId = setInterval(async (): Promise<void> => {
      if (!this.running) {
        return;
      }

      await this.pollCursor();
    }, CURSOR_POLL_MS as number);
  }

  /**
   * Poll the current cursor style via CDP Runtime.evaluate.
   */
  private async pollCursor(): Promise<void> {
    try {
      const result: { result: { value?: unknown } } = (await this.cdp.send('Runtime.evaluate', {
        expression:
          'getComputedStyle(document.body).cursor || document.body.style.cursor || "default"',
      })) as { result: { value?: unknown } };

      const cursorStr: Str = (
        typeof result.result.value === 'string' ? result.result.value : 'default'
      ) as Str;

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
