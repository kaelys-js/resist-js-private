/**
 * Tests for the screenshot loop frame provider.
 *
 * Verifies capture loop, throttle timing, binary WS send,
 * start/stop lifecycle, and dirty-frame detection integration.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bool, Num, Str } from '@/schemas/common';
import { ScreenshotLoopProvider } from './screenshot-loop';

// =============================================================================
// Mocks
// =============================================================================

/** Fake JPEG buffer returned by page.screenshot(). */
const FAKE_JPEG: Buffer = Buffer.from('fake-jpeg-data');

/**
 * Create a mock Playwright page.
 *
 * @returns Mock page with screenshot, evaluate, and isClosed spies
 */
function createMockPage(): {
  screenshot: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  isClosed: ReturnType<typeof vi.fn>;
} {
  return {
    screenshot: vi.fn().mockResolvedValue(FAKE_JPEG),
    evaluate: vi.fn().mockResolvedValue('default' as Str),
    isClosed: vi.fn().mockReturnValue(false as Bool),
  };
}

/** WebSocket OPEN ready state. */
const WS_OPEN: Num = 1 as Num;

/**
 * Create a mock WebSocket.
 *
 * @returns Mock ws with send spy and readyState
 */
function createMockWs(): {
  send: ReturnType<typeof vi.fn>;
  readyState: Num;
} {
  return {
    send: vi.fn(),
    readyState: WS_OPEN,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ScreenshotLoopProvider', (): void => {
  let page: ReturnType<typeof createMockPage>;
  let ws: ReturnType<typeof createMockWs>;
  let provider: ScreenshotLoopProvider;

  beforeEach((): void => {
    vi.useFakeTimers();
    page = createMockPage();
    ws = createMockWs();
    provider = new ScreenshotLoopProvider(page as never, ws as never);
  });

  afterEach((): void => {
    provider.stop();
    vi.useRealTimers();
  });

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  it('is not running initially', (): void => {
    expect(provider.isRunning).toBe(false as Bool);
  });

  it('is running after start()', (): void => {
    provider.start(60 as Num);
    expect(provider.isRunning).toBe(true as Bool);
  });

  it('is not running after stop()', (): void => {
    provider.start(60 as Num);
    provider.stop();
    expect(provider.isRunning).toBe(false as Bool);
  });

  it('start() is idempotent — calling twice does not double-start', (): void => {
    provider.start(60 as Num);
    provider.start(60 as Num);
    expect(provider.isRunning).toBe(true as Bool);
  });

  it('stop() is idempotent — calling on stopped provider is safe', (): void => {
    provider.stop();
    expect(provider.isRunning).toBe(false as Bool);
  });

  /* ---------------------------------------------------------------- */
  /*  Frame capture                                                    */
  /* ---------------------------------------------------------------- */

  it('captures a screenshot on first tick after start', async (): Promise<void> => {
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(50);
    expect(page.screenshot).toHaveBeenCalled();
  });

  it('passes JPEG type and quality to page.screenshot()', async (): Promise<void> => {
    provider.start(80 as Num);
    await vi.advanceTimersByTimeAsync(50);
    expect(page.screenshot).toHaveBeenCalledWith({ type: 'jpeg', quality: 80 });
  });

  it('sends JPEG binary data over WebSocket', async (): Promise<void> => {
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(50);
    expect(ws.send).toHaveBeenCalledWith(FAKE_JPEG);
  });

  it('does not send if WebSocket is not OPEN', async (): Promise<void> => {
    ws.readyState = 3 as Num; // CLOSED
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(100);
    expect(ws.send).not.toHaveBeenCalled();
  });

  it('captures multiple frames over time', async (): Promise<void> => {
    provider.start(60 as Num);
    // 5 intervals worth of time at ~33ms per frame (30 FPS)
    await vi.advanceTimersByTimeAsync(200);
    expect((page.screenshot as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('stops capturing after stop()', async (): Promise<void> => {
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(100);
    const callsBefore: Num = (page.screenshot as ReturnType<typeof vi.fn>).mock.calls.length as Num;
    provider.stop();
    await vi.advanceTimersByTimeAsync(200);
    const callsAfter: Num = (page.screenshot as ReturnType<typeof vi.fn>).mock.calls.length as Num;
    expect(callsAfter).toBe(callsBefore);
  });

  /* ---------------------------------------------------------------- */
  /*  Frame count                                                      */
  /* ---------------------------------------------------------------- */

  it('tracks frame count', async (): Promise<void> => {
    expect(provider.frameCount).toBe(0 as Num);
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(100);
    expect((provider.frameCount as number) > 0).toBe(true as Bool);
  });

  it('resets frame count on stop', async (): Promise<void> => {
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(100);
    provider.stop();
    expect(provider.frameCount).toBe(0 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Error resilience                                                 */
  /* ---------------------------------------------------------------- */

  it('continues running when a single screenshot fails', async (): Promise<void> => {
    page.screenshot.mockRejectedValueOnce(new Error('Transient failure'));
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(100);
    // Should still be running despite one failure
    expect(provider.isRunning).toBe(true as Bool);
    // And should have retried
    expect((page.screenshot as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('stops when page is closed', async (): Promise<void> => {
    page.isClosed.mockReturnValue(true as Bool);
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(100);
    expect(provider.isRunning).toBe(false as Bool);
  });

  /* ---------------------------------------------------------------- */
  /*  Dirty detection                                                  */
  /* ---------------------------------------------------------------- */

  it('setDirtyDetector enables skip-if-clean optimization', async (): Promise<void> => {
    const detector: { isDirty: ReturnType<typeof vi.fn> } = {
      isDirty: vi.fn().mockResolvedValue(false as Bool),
    };
    provider.setDirtyDetector(detector as never);
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(200);
    // No screenshots should be taken when not dirty
    expect(page.screenshot).not.toHaveBeenCalled();
  });

  it('captures frame when dirty detector returns true', async (): Promise<void> => {
    const detector: { isDirty: ReturnType<typeof vi.fn> } = {
      isDirty: vi.fn().mockResolvedValue(true as Bool),
    };
    provider.setDirtyDetector(detector as never);
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(50);
    expect(page.screenshot).toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /*  FPS control                                                      */
  /* ---------------------------------------------------------------- */

  it('adjustTargetFps changes the capture interval', async (): Promise<void> => {
    provider.adjustTargetFps(10 as Num); // 100ms per frame
    provider.start(60 as Num);
    // At 10 FPS, 250ms should yield ~2 captures
    await vi.advanceTimersByTimeAsync(250);
    const calls: Num = (page.screenshot as ReturnType<typeof vi.fn>).mock.calls.length as Num;
    expect((calls as number) >= 2 && (calls as number) <= 3).toBe(true as Bool);
  });

  /* ---------------------------------------------------------------- */
  /*  Cursor polling                                                   */
  /* ---------------------------------------------------------------- */

  it('polls cursor style via page.evaluate and sends cursor message', async (): Promise<void> => {
    page.evaluate.mockResolvedValue('pointer' as Str);
    provider.start(60 as Num);
    // Cursor poll happens every 1000ms
    await vi.advanceTimersByTimeAsync(1100);
    expect(page.evaluate).toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"cursor"') as unknown as string,
    );
  });

  it('does not send cursor message when cursor unchanged', async (): Promise<void> => {
    page.evaluate.mockResolvedValue('default' as Str);
    provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(1100);
    // "default" is the initial value, so no cursor message should be sent
    const cursorCalls: Num = ws.send.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && (call[0] as string).includes('"type":"cursor"'),
    ).length as Num;
    expect(cursorCalls).toBe(0 as Num);
  });
});
