/**
 * Tests for the preview session manager.
 *
 * Uses mocked Playwright and WebSocket to test session lifecycle
 * without launching real browsers.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Bool, Num, Str } from '@/schemas/common';
import { PreviewSessionManager, type PreviewSession } from './preview-session';
import type { SessionConfig } from './preview-types';
import { startScrcpyServer, stopScrcpyServer, type ScrcpyServerHandle } from './scrcpy-server';
import { createTranscoder, type TranscodeHandle } from './scrcpy-transcode';
import { IosPreviewCapturePool } from './ios-preview-pool';
import { IosInputDispatcher } from './ios-input';

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('./scrcpy-server', (): Record<string, unknown> => {
  const module: Record<string, unknown> = {
    startScrcpyServer: vi.fn(),
    stopScrcpyServer: vi.fn(),
    SCRCPY_SERVER_PATH: '/data/local/tmp/scrcpy-server.jar' as Str,
    SCRCPY_VERSION: '3.1' as Str,
  };
  return { ...module, default: module };
});

vi.mock('./scrcpy-transcode', (): Record<string, unknown> => {
  const module: Record<string, unknown> = {
    createTranscoder: vi.fn(),
    isFfmpegAvailable: vi.fn().mockResolvedValue(true),
  };
  return { ...module, default: module };
});

vi.mock('./ios-preview-pool', (): Record<string, unknown> => {
  /* Regular function (not arrow) so vi.fn() wrapper is constructable with `new` */
  const MockPool = vi.fn().mockImplementation(function () {
    return {
      start: vi.fn(),
      stop: vi.fn(),
      isRunning: false,
      frameCount: 0,
      adjustTargetFps: vi.fn(),
    };
  });
  const module: Record<string, unknown> = {
    IosPreviewCapturePool: MockPool,
    DEFAULT_POOL_SIZE: 3,
    DEFAULT_TARGET_FPS: 20,
  };
  return { ...module, default: module };
});

vi.mock('./ios-input', (): Record<string, unknown> => {
  /* Regular function (not arrow) so vi.fn() wrapper is constructable with `new` */
  const MockDispatcher = vi.fn().mockImplementation(function () {
    return {
      click: vi.fn(),
      mouseDown: vi.fn(),
      mouseUp: vi.fn(),
      mouseMove: vi.fn(),
      keyPress: vi.fn(),
      typeText: vi.fn(),
      scroll: vi.fn(),
    };
  });
  const module: Record<string, unknown> = {
    IosInputDispatcher: MockDispatcher,
    IOS_INPUT_METHOD_SIMCTL: 'simctl',
    IOS_INPUT_METHOD_APPLESCRIPT: 'applescript',
  };
  return { ...module, default: module };
});

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Minimal mock CDPSession.
 *
 * @returns Mock CDP session record
 */
function createMockCdpSession(): Record<Str, unknown> {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    detach: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Minimal mock Playwright Page.
 *
 * @returns Mock page record
 */
function createMockPage(): Record<Str, unknown> {
  const cdp = createMockCdpSession();
  const context: Record<Str, unknown> = {
    newCDPSession: vi.fn().mockResolvedValue(cdp),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    context: vi.fn().mockReturnValue(context),
    isClosed: vi.fn().mockReturnValue(false as Bool),
    _mockContext: context,
    _mockCdp: cdp,
  };
}

/**
 * Minimal mock Playwright Browser.
 *
 * @returns Mock browser record
 */
function createMockBrowser(): Record<Str, unknown> {
  const page = createMockPage();
  const context: Record<Str, unknown> = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
    newCDPSession: vi.fn().mockResolvedValue(page._mockCdp),
  };
  return {
    newContext: vi.fn().mockResolvedValue(context),
    isConnected: vi.fn().mockReturnValue(true as Bool),
    close: vi.fn().mockResolvedValue(undefined),
    _mockContext: context,
    _mockPage: page,
  };
}

/**
 * Minimal mock WebSocket.
 *
 * @returns Mock WebSocket record
 */
function createMockWs(): Record<Str, unknown> {
  const listeners: Map<Str, Array<(...args: unknown[]) => void>> = new Map();
  return {
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: Str, handler: (...args: unknown[]) => void): void => {
      const existing = listeners.get(event) ?? [];
      existing.push(handler);
      listeners.set(event, existing);
    }),
    off: vi.fn(),
    readyState: 1, // OPEN
    _listeners: listeners,
    _emit(event: Str, ...args: unknown[]): void {
      const handlers = listeners.get(event) ?? [];
      for (const handler of handlers) {
        handler(...args);
      }
    },
  };
}

/** Standard test config for a Chromium session. */
const TEST_CONFIG: SessionConfig = {
  engine: 'chromium',
  component: 'button',
  width: 1280,
  height: 720,
  quality: 60,
} as SessionConfig;

/** Android test config for a scrcpy session. */
const ANDROID_CONFIG: SessionConfig = {
  engine: 'android-emulator',
  component: 'button',
  width: 1080,
  height: 1920,
  quality: 60,
  device: 'emulator-5554',
} as SessionConfig;

/** Mock scrcpy server handle. */
const MOCK_SCRCPY_HANDLE: ScrcpyServerHandle = {
  pid: 1234 as Num,
  kill: vi.fn(),
  scid: 42 as Num,
  process: {} as never,
};

/** Mock transcode handle. */
const MOCK_TRANSCODER: TranscodeHandle = {
  pid: 5678 as Num,
  write: vi.fn(),
  stop: vi.fn(),
};

/** iOS Simulator test config. */
const IOS_CONFIG: SessionConfig = {
  engine: 'ios-simulator',
  component: 'button',
  width: 1170,
  height: 2532,
  quality: 60,
  device: 'B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0',
} as SessionConfig;

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('PreviewSessionManager', (): void => {
  let manager: PreviewSessionManager;

  beforeEach((): void => {
    manager = new PreviewSessionManager();

    // Set up scrcpy mocks with fresh return values each test
    vi.mocked(startScrcpyServer).mockReturnValue({ ...MOCK_SCRCPY_HANDLE, kill: vi.fn() });
    vi.mocked(createTranscoder).mockReturnValue({ ...MOCK_TRANSCODER, stop: vi.fn() });
  });

  afterEach(async (): Promise<void> => {
    await manager.destroyAll();
  });

  it('starts with zero active sessions', (): void => {
    expect(manager.activeCount).toBe(0 as Num);
  });

  it('tracks session count after creation', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      TEST_CONFIG,
      mockBrowser as never,
    );

    expect(manager.activeCount).toBe(1 as Num);
    expect(session.id).toBeTruthy();
    expect(session.config.engine).toBe('chromium' as Str);
  });

  it('creates a browser context with correct viewport', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, TEST_CONFIG, mockBrowser as never);

    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        viewport: { width: 1280, height: 720 },
      }),
    );
  });

  it('navigates page to isolate route', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, TEST_CONFIG, mockBrowser as never);

    const page = mockBrowser._mockPage as Record<Str, unknown>;
    expect(page.goto).toHaveBeenCalledWith(
      expect.stringContaining('/isolate/button'),
      expect.any(Object),
    );
  });

  it('destroys session and decrements count', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      TEST_CONFIG,
      mockBrowser as never,
    );

    expect(manager.activeCount).toBe(1 as Num);
    await manager.destroySession(session.id);
    expect(manager.activeCount).toBe(0 as Num);
  });

  it('destroyAll cleans up all sessions', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs1 = createMockWs();
    const mockWs2 = createMockWs();

    await manager.createSession(mockWs1 as never, TEST_CONFIG, mockBrowser as never);
    await manager.createSession(mockWs2 as never, TEST_CONFIG, mockBrowser as never);

    expect(manager.activeCount).toBe(2 as Num);
    await manager.destroyAll();
    expect(manager.activeCount).toBe(0 as Num);
  });

  it('applies colorScheme from config', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();
    const config: SessionConfig = { ...TEST_CONFIG, colorScheme: 'dark' } as SessionConfig;

    await manager.createSession(mockWs as never, config, mockBrowser as never);

    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        colorScheme: 'dark',
      }),
    );
  });

  it('applies deviceScaleFactor from config', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();
    const config: SessionConfig = { ...TEST_CONFIG, scale: 2 } as SessionConfig;

    await manager.createSession(mockWs as never, config, mockBrowser as never);

    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceScaleFactor: 2,
      }),
    );
  });

  it('sends metadata message on connection', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, TEST_CONFIG, mockBrowser as never);

    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"metadata"'));
  });

  it('getSession returns session by id', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      TEST_CONFIG,
      mockBrowser as never,
    );

    const found = manager.getSession(session.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(session.id);
  });

  it('getSession returns undefined for unknown id', (): void => {
    const found = manager.getSession('nonexistent' as Str);
    expect(found).toBeUndefined();
  });

  /* ---------------------------------------------------------------- */
  /*  Engine routing                                                   */
  /* ---------------------------------------------------------------- */

  it('creates CDP session for chromium engine', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      TEST_CONFIG,
      mockBrowser as never,
    );

    expect(session.cdp).toBeDefined();
  });

  it('does NOT create CDP session for firefox engine', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();
    const config: SessionConfig = { ...TEST_CONFIG, engine: 'firefox' } as SessionConfig;

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      config,
      mockBrowser as never,
    );

    expect(session.cdp).toBeUndefined();
  });

  it('does NOT create CDP session for webkit engine', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();
    const config: SessionConfig = { ...TEST_CONFIG, engine: 'webkit' } as SessionConfig;

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      config,
      mockBrowser as never,
    );

    expect(session.cdp).toBeUndefined();
  });

  it('sets engineType to cdp for chromium', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      TEST_CONFIG,
      mockBrowser as never,
    );

    expect(session.engineType).toBe('cdp' as Str);
  });

  it('sets engineType to screenshot-loop for firefox', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();
    const config: SessionConfig = { ...TEST_CONFIG, engine: 'firefox' } as SessionConfig;

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      config,
      mockBrowser as never,
    );

    expect(session.engineType).toBe('screenshot-loop' as Str);
  });

  it('sets engineType to screenshot-loop for webkit', async (): Promise<void> => {
    const mockBrowser = createMockBrowser();
    const mockWs = createMockWs();
    const config: SessionConfig = { ...TEST_CONFIG, engine: 'webkit' } as SessionConfig;

    const session: PreviewSession = await manager.createSession(
      mockWs as never,
      config,
      mockBrowser as never,
    );

    expect(session.engineType).toBe('screenshot-loop' as Str);
  });

  /* ---------------------------------------------------------------- */
  /*  scrcpy engine (Android emulator)                                 */
  /* ---------------------------------------------------------------- */

  it('sets engineType to scrcpy for android-emulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, ANDROID_CONFIG);

    expect(session.engineType).toBe('scrcpy');
  });

  it('does NOT create browser context for android-emulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, ANDROID_CONFIG);

    expect(session.context).toBeUndefined();
    expect(session.page).toBeUndefined();
    expect(session.cdp).toBeUndefined();
  });

  it('starts scrcpy server for android-emulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, ANDROID_CONFIG);

    expect(startScrcpyServer).toHaveBeenCalledWith(
      'emulator-5554' as Str,
      expect.objectContaining({
        width: 1080 as Num,
        height: 1920 as Num,
      }),
    );
  });

  it('creates transcoder for android-emulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, ANDROID_CONFIG);

    expect(createTranscoder).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1080 as Num,
        height: 1920 as Num,
        quality: 60 as Num,
      }),
      expect.any(Function),
    );
  });

  it('stores scrcpy handles on session', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, ANDROID_CONFIG);

    expect(session.scrcpyServer).toBeDefined();
    expect(session.transcoder).toBeDefined();
  });

  it('sends metadata for scrcpy sessions', async (): Promise<void> => {
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, ANDROID_CONFIG);

    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"metadata"'));
  });

  it('cleans up scrcpy resources on destroy', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, ANDROID_CONFIG);

    const transcoderStop = session.transcoder?.stop;
    await manager.destroySession(session.id);

    expect(stopScrcpyServer).toHaveBeenCalled();
    expect(transcoderStop).toHaveBeenCalled();
  });

  it('destroyAll cleans up scrcpy sessions', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, ANDROID_CONFIG);

    const transcoderStop = session.transcoder?.stop;
    await manager.destroyAll();

    expect(manager.activeCount).toBe(0 as Num);
    expect(stopScrcpyServer).toHaveBeenCalled();
    expect(transcoderStop).toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /*  iOS Simulator engine                                             */
  /* ---------------------------------------------------------------- */

  it('sets engineType to ios-simctl for ios-simulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    expect(session.engineType).toBe('ios-simctl');
  });

  it('does NOT create browser context for ios-simulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    expect(session.context).toBeUndefined();
    expect(session.page).toBeUndefined();
    expect(session.cdp).toBeUndefined();
  });

  it('creates iOS capture pool for ios-simulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    expect(session.iosCapturePool).toBeDefined();
    expect(IosPreviewCapturePool).toHaveBeenCalledWith(
      'B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0' as Str,
    );
  });

  it('creates iOS input dispatcher for ios-simulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    expect(session.iosInput).toBeDefined();
    expect(IosInputDispatcher).toHaveBeenCalledWith(
      'B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0' as Str,
      1170 as Num,
      2532 as Num,
    );
  });

  it('starts capture pool for ios-simulator', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    expect(session.iosCapturePool?.start).toHaveBeenCalled();
  });

  it('sends metadata for iOS sessions', async (): Promise<void> => {
    const mockWs = createMockWs();

    await manager.createSession(mockWs as never, IOS_CONFIG);

    expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('"type":"metadata"'));
  });

  it('cleans up iOS resources on destroy', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    const poolStop = session.iosCapturePool?.stop;
    await manager.destroySession(session.id);

    expect(poolStop).toHaveBeenCalled();
  });

  it('destroyAll cleans up iOS sessions', async (): Promise<void> => {
    const mockWs = createMockWs();

    const session: PreviewSession = await manager.createSession(mockWs as never, IOS_CONFIG);

    const poolStop = session.iosCapturePool?.stop;
    await manager.destroyAll();

    expect(manager.activeCount).toBe(0 as Num);
    expect(poolStop).toHaveBeenCalled();
  });
});
