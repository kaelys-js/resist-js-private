/**
 * Preview session lifecycle manager.
 *
 * Creates and tracks active Live View preview sessions. Each session
 * owns a Playwright browser context + page, a CDP session (for
 * Chromium), and a WebSocket connection to the client canvas.
 *
 * Responsibilities:
 * - Create sessions: launch context, navigate to isolate route, open CDP
 * - Destroy sessions: close page, detach CDP, close context
 * - Track active sessions by unique ID
 * - Clean up all sessions on server shutdown
 *
 * @module
 */

import type { Browser, BrowserContext, CDPSession, Page } from 'playwright';
import type { WebSocket } from 'ws';
import type { Num, Str } from '@/schemas/common';
import { log } from '@/utils/core/logger';
import type { SessionConfig } from './preview-types';
import { startScrcpyServer, stopScrcpyServer, type ScrcpyServerHandle } from './scrcpy-server';
import { createTranscoder, type TranscodeHandle } from './scrcpy-transcode';
import { IosPreviewCapturePool } from './ios-preview-pool';
import { IosInputDispatcher } from './ios-input';

/* ------------------------------------------------------------------ */
/*  Session type                                                       */
/* ------------------------------------------------------------------ */

/** Engine type determines which frame provider is used. */
export type EngineType = 'cdp' | 'screenshot-loop' | 'scrcpy' | 'ios-simctl';

/** An active preview session with all associated resources. */
export type PreviewSession = {
  /** Unique session identifier. */
  readonly id: Str;
  /** Session configuration from client query params. */
  readonly config: SessionConfig;
  /** Engine type: 'cdp' for Chromium, 'screenshot-loop' for Firefox/WebKit, 'scrcpy' for Android. */
  readonly engineType: EngineType;
  /** Playwright browser context (undefined for scrcpy sessions). */
  readonly context: BrowserContext | undefined;
  /** Playwright page rendering the component isolate (undefined for scrcpy sessions). */
  readonly page: Page | undefined;
  /** CDP session for Chromium screencast (undefined for other engines). */
  readonly cdp: CDPSession | undefined;
  /** WebSocket connection to the client canvas. */
  readonly ws: WebSocket;
  /** scrcpy server process handle (undefined for Playwright sessions). */
  readonly scrcpyServer: ScrcpyServerHandle | undefined;
  /** ffmpeg H.264→JPEG transcoder handle (undefined for Playwright sessions). */
  readonly transcoder: TranscodeHandle | undefined;
  /** iOS capture pool (undefined for non-iOS sessions). */
  readonly iosCapturePool: IosPreviewCapturePool | undefined;
  /** iOS input dispatcher (undefined for non-iOS sessions). */
  readonly iosInput: IosInputDispatcher | undefined;
};

/* ------------------------------------------------------------------ */
/*  ID generation                                                      */
/* ------------------------------------------------------------------ */

/** Counter for generating unique session IDs. */
let nextId: Num = 0 as Num;

/**
 * Generate a unique session identifier.
 *
 * @returns Unique string ID like 'ps-0', 'ps-1', etc.
 */
function generateId(): Str {
  const id: Str = `ps-${nextId}` as Str;
  nextId = ((nextId as number) + 1) as Num;
  return id;
}

/* ------------------------------------------------------------------ */
/*  Isolate URL builder                                                */
/* ------------------------------------------------------------------ */

/** Default dev server port for the isolate route. */
const DEV_PORT: Num = 3100 as Num;

/**
 * Build the isolate route URL for a component.
 *
 * @param component - Component directory name (e.g., 'button')
 * @param config - Session configuration with optional card styles
 * @returns Full URL to the isolate page
 */
function buildIsolateUrl(component: Str, config: SessionConfig): Str {
  const base: Str = `http://localhost:${DEV_PORT}/isolate/${component}` as Str;
  const params: URLSearchParams = new URLSearchParams();

  if (config.cardStyles) {
    params.set('cardStyles', config.cardStyles as string);
  }
  if (config.variant) {
    params.set('variant', config.variant as string);
  }
  if (config.option) {
    params.set('option', config.option as string);
  }

  const qs: string = params.toString();
  if (qs) {
    return `${base}?${qs}` as Str;
  }
  return base;
}

/* ------------------------------------------------------------------ */
/*  Manager                                                            */
/* ------------------------------------------------------------------ */

/**
 * Manages the lifecycle of Live View preview sessions.
 *
 * Tracks all active sessions by ID and provides create/destroy/query
 * operations. Each session gets its own browser context and page.
 *
 * @example
 * const manager = new PreviewSessionManager();
 * const session = await manager.createSession(ws, config, browser);
 * // ... later
 * await manager.destroySession(session.id);
 */
export class PreviewSessionManager {
  /** Active sessions keyed by ID. */
  private readonly sessions: Map<Str, PreviewSession> = new Map();

  /**
   * Number of currently active sessions.
   *
   * @returns Session count
   */
  get activeCount(): Num {
    return this.sessions.size as Num;
  }

  /**
   * Create a new preview session.
   *
   * For Playwright engines (chromium, firefox, webkit): launches a
   * browser context, navigates to the isolate route, opens CDP for
   * Chromium. For Android: starts scrcpy server and ffmpeg transcoder.
   *
   * @param ws - WebSocket connection to the client canvas
   * @param config - Session configuration from query params
   * @param browser - Playwright browser instance (required for Playwright engines, omit for scrcpy)
   * @returns The created preview session
   */
  async createSession(
    ws: WebSocket,
    config: SessionConfig,
    browser?: Browser,
  ): Promise<PreviewSession> {
    const id: Str = generateId();

    // Android emulator uses scrcpy engine — no Playwright browser needed
    if (config.engine === 'android-emulator') {
      return this.createScrcpySession(id, ws, config);
    }

    // iOS Simulator uses simctl capture pool — no Playwright browser needed
    if (config.engine === 'ios-simulator') {
      return this.createIosSession(id, ws, config);
    }

    // Playwright engines require a browser instance
    if (!browser) {
      throw new Error('Browser instance required for Playwright engines');
    }

    // Build context options from session config
    const contextOptions: Record<string, unknown> = {
      viewport: {
        width: config.width as number,
        height: config.height as number,
      },
    };

    if (config.scale !== undefined) {
      contextOptions.deviceScaleFactor = config.scale as number;
    }
    if (config.colorScheme !== undefined) {
      contextOptions.colorScheme = config.colorScheme;
    }
    if (config.reducedMotion !== undefined) {
      contextOptions.reducedMotion = config.reducedMotion;
    }
    if (config.forcedColors !== undefined) {
      contextOptions.forcedColors = config.forcedColors;
    }

    const context: BrowserContext = await browser.newContext(contextOptions);
    const page: Page = await context.newPage();

    // Navigate to the component isolate route
    const isolateUrl: Str = buildIsolateUrl(config.component, config);
    await page.goto(isolateUrl as string, { waitUntil: 'load' });

    // Determine engine type based on browser engine
    const engineType: EngineType = config.engine === 'chromium' ? 'cdp' : 'screenshot-loop';

    // Open CDP session for Chromium engines
    let cdp: CDPSession | undefined;
    if (engineType === 'cdp') {
      cdp = await context.newCDPSession(page);
    }

    const session: PreviewSession = {
      id,
      config,
      engineType,
      context,
      page,
      cdp,
      ws,
      scrcpyServer: undefined,
      transcoder: undefined,
      iosCapturePool: undefined,
      iosInput: undefined,
    };

    this.sessions.set(id, session);

    // Send initial metadata to client
    this.sendMetadata(ws, config);

    log.info('Preview session created', { id, engine: config.engine, component: config.component });

    return session;
  }

  /**
   * Create a scrcpy-based Android preview session.
   *
   * Starts the scrcpy server on the device, creates an ffmpeg
   * transcoder to convert H.264→JPEG for the WebSocket stream.
   *
   * @param id - Session identifier
   * @param ws - WebSocket connection to the client canvas
   * @param config - Session configuration with device serial
   * @returns The created scrcpy preview session
   */
  private createScrcpySession(id: Str, ws: WebSocket, config: SessionConfig): PreviewSession {
    const serial: Str = (config.device ?? 'emulator-5554') as Str;
    const quality: Num = (config.quality ?? 60) as Num;

    // Start scrcpy server on the Android device
    const scrcpyServer: ScrcpyServerHandle = startScrcpyServer(serial, {
      width: config.width,
      height: config.height,
    });

    // Create ffmpeg transcoder: H.264 → JPEG frames → WebSocket
    const transcoder: TranscodeHandle = createTranscoder(
      {
        width: config.width,
        height: config.height,
        quality,
      },
      (jpeg: Buffer): void => {
        // Forward JPEG frames to the client via WebSocket binary frame
        // readyState 1 = OPEN (ws module constant)
        if (ws.readyState === 1) {
          ws.send(jpeg);
        }
      },
    );

    const session: PreviewSession = {
      id,
      config,
      engineType: 'scrcpy',
      context: undefined,
      page: undefined,
      cdp: undefined,
      ws,
      scrcpyServer,
      transcoder,
      iosCapturePool: undefined,
      iosInput: undefined,
    };

    this.sessions.set(id, session);

    // Send initial metadata to client
    this.sendMetadata(ws, config);

    log.info('scrcpy preview session created', {
      id,
      serial,
      component: config.component,
    });

    return session;
  }

  /**
   * Create an iOS Simulator preview session.
   *
   * Initializes a capture pool for parallel screenshot capture
   * and an input dispatcher for mouse/keyboard injection.
   *
   * @param id - Session identifier
   * @param ws - WebSocket connection to the client canvas
   * @param config - Session configuration with device UDID
   * @returns The created iOS preview session
   */
  private createIosSession(id: Str, ws: WebSocket, config: SessionConfig): PreviewSession {
    const udid: Str = (config.device ?? 'booted') as Str;
    const quality: Num = (config.quality ?? 60) as Num;

    // Create parallel simctl capture pool
    const iosCapturePool: IosPreviewCapturePool = new IosPreviewCapturePool(udid);

    // Create input dispatcher for mouse/keyboard events
    const iosInput: IosInputDispatcher = new IosInputDispatcher(udid, config.width, config.height);

    // Start the capture loop — frames go directly to WebSocket
    iosCapturePool.start((jpeg: Buffer): void => {
      // readyState 1 = OPEN (ws module constant)
      if (ws.readyState === 1) {
        ws.send(jpeg);
      }
    }, quality);

    const session: PreviewSession = {
      id,
      config,
      engineType: 'ios-simctl',
      context: undefined,
      page: undefined,
      cdp: undefined,
      ws,
      scrcpyServer: undefined,
      transcoder: undefined,
      iosCapturePool,
      iosInput,
    };

    this.sessions.set(id, session);

    // Send initial metadata to client
    this.sendMetadata(ws, config);

    log.info('iOS Simulator preview session created', {
      id,
      udid,
      component: config.component,
    });

    return session;
  }

  /**
   * Send initial metadata message to the client.
   *
   * @param ws - WebSocket connection
   * @param config - Session configuration
   */
  private sendMetadata(ws: WebSocket, config: SessionConfig): void {
    const metadata: string = JSON.stringify({
      type: 'metadata',
      width: config.width,
      height: config.height,
      engine: config.engine,
    });
    ws.send(metadata);
  }

  /**
   * Get a session by ID.
   *
   * @param id - Session identifier
   * @returns The session if found, undefined otherwise
   */
  getSession(id: Str): PreviewSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Destroy a session by ID and release all resources.
   *
   * For Playwright sessions: detaches CDP, closes page and context.
   * For scrcpy sessions: stops transcoder and scrcpy server.
   * Removes the session from tracking.
   *
   * @param id - Session identifier to destroy
   */
  async destroySession(id: Str): Promise<void> {
    const session: PreviewSession | undefined = this.sessions.get(id);
    if (!session) return;

    this.sessions.delete(id);

    // Clean up iOS resources
    if (session.iosCapturePool) {
      session.iosCapturePool.stop();
    }

    // Clean up scrcpy resources
    if (session.transcoder) {
      session.transcoder.stop();
    }
    if (session.scrcpyServer) {
      stopScrcpyServer(session.scrcpyServer);
    }

    // Clean up Playwright resources
    try {
      if (session.cdp) {
        await session.cdp.detach();
      }
    } catch {
      /* CDP detach may fail if browser already closed — non-critical */
    }

    try {
      if (session.page && !session.page.isClosed()) {
        await session.page.close();
      }
    } catch {
      /* Page close may fail if context already closed — non-critical */
    }

    try {
      if (session.context) {
        await session.context.close();
      }
    } catch {
      /* Context close may fail if browser disconnected — non-critical */
    }

    log.info('Preview session destroyed', { id });
  }

  /**
   * Destroy all active sessions.
   *
   * Used during server shutdown to release all browser resources.
   */
  async destroyAll(): Promise<void> {
    const ids: Str[] = [...this.sessions.keys()];
    const promises: Array<Promise<void>> = ids.map((id: Str) => this.destroySession(id));
    await Promise.all(promises);
  }
}
