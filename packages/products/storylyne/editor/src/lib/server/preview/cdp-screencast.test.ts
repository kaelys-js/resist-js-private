/**
 * Tests for the CDP screencast provider.
 *
 * Verifies frame handling, ack flow, FPS counting, and start/stop
 * lifecycle using mocked CDPSession and WebSocket.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Bool, Num, Str } from '@/schemas/common';
import { CdpScreencastProvider } from './cdp-screencast';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a mock CDPSession with event tracking.
 *
 * @returns Mock CDP session with listeners map
 */
function createMockCdp(): {
  send: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  listeners: Map<Str, Array<(params: unknown) => void>>;
  emit: (event: Str, params: unknown) => void;
} {
  const listeners: Map<Str, Array<(params: unknown) => void>> = new Map();
  return {
    send: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: Str, handler: (params: unknown) => void): void => {
      const existing = listeners.get(event) ?? [];
      existing.push(handler);
      listeners.set(event, existing);
    }),
    off: vi.fn(),
    listeners,
    emit(event: Str, params: unknown): void {
      const handlers = listeners.get(event) ?? [];
      for (const handler of handlers) {
        handler(params);
      }
    },
  };
}

/**
 * Create a mock WebSocket.
 *
 * @returns Mock ws with send spy
 */
function createMockWs(): {
  send: ReturnType<typeof vi.fn>;
  readyState: Num;
} {
  return {
    send: vi.fn(),
    readyState: 1 as Num, // WebSocket.OPEN
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('CdpScreencastProvider', (): void => {
  let cdp: ReturnType<typeof createMockCdp>;
  let ws: ReturnType<typeof createMockWs>;
  let provider: CdpScreencastProvider;

  beforeEach((): void => {
    vi.useFakeTimers();
    cdp = createMockCdp();
    ws = createMockWs();
    provider = new CdpScreencastProvider(cdp as never, ws as never);
  });

  afterEach(async (): Promise<void> => {
    await provider.stop();
    vi.useRealTimers();
  });

  it('starts screencast with correct CDP params', async (): Promise<void> => {
    await provider.start(60 as Num);

    expect(cdp.send).toHaveBeenCalledWith('Page.startScreencast', {
      format: 'jpeg',
      quality: 60,
      everyNthFrame: 1,
    });
  });

  it('registers Page.screencastFrame event listener on start', async (): Promise<void> => {
    await provider.start(60 as Num);

    expect(cdp.on).toHaveBeenCalledWith('Page.screencastFrame', expect.any(Function));
  });

  it('sends binary frame data via WebSocket on screencast frame', async (): Promise<void> => {
    await provider.start(60 as Num);

    // Simulate a screencast frame event with base64 data
    // "AAAA" decodes to 3 zero bytes
    cdp.emit('Page.screencastFrame' as Str, {
      data: 'AAAA',
      metadata: { pageScaleFactor: 1, deviceWidth: 1280, deviceHeight: 720 },
      sessionId: 1,
    });

    // Should send binary data
    expect(ws.send).toHaveBeenCalled();
    const [sentData] = ws.send.mock.calls[0]!;
    expect(sentData).toBeInstanceOf(Buffer);
  });

  it('acknowledges each frame via CDP', async (): Promise<void> => {
    await provider.start(60 as Num);

    cdp.emit('Page.screencastFrame' as Str, {
      data: 'AAAA',
      metadata: { pageScaleFactor: 1, deviceWidth: 1280, deviceHeight: 720 },
      sessionId: 42,
    });

    expect(cdp.send).toHaveBeenCalledWith('Page.screencastFrameAck', {
      sessionId: 42,
    });
  });

  it('stops screencast via CDP', async (): Promise<void> => {
    await provider.start(60 as Num);
    await provider.stop();

    expect(cdp.send).toHaveBeenCalledWith('Page.stopScreencast');
  });

  it('tracks running state', async (): Promise<void> => {
    expect(provider.isRunning).toBe(false as Bool);

    await provider.start(60 as Num);
    expect(provider.isRunning).toBe(true as Bool);

    await provider.stop();
    expect(provider.isRunning).toBe(false as Bool);
  });

  it('does not send frame when WS is not open', async (): Promise<void> => {
    ws.readyState = 3 as Num; // WebSocket.CLOSED
    await provider.start(60 as Num);

    cdp.emit('Page.screencastFrame' as Str, {
      data: 'AAAA',
      metadata: { pageScaleFactor: 1, deviceWidth: 1280, deviceHeight: 720 },
      sessionId: 1,
    });

    // Should NOT send binary data (ws closed)
    expect(ws.send).not.toHaveBeenCalled();
    // Should still ack the frame
    expect(cdp.send).toHaveBeenCalledWith('Page.screencastFrameAck', { sessionId: 1 });
  });

  it('tracks frame count', async (): Promise<void> => {
    await provider.start(60 as Num);

    expect(provider.frameCount).toBe(0 as Num);

    cdp.emit('Page.screencastFrame' as Str, {
      data: 'AAAA',
      metadata: { pageScaleFactor: 1, deviceWidth: 1280, deviceHeight: 720 },
      sessionId: 1,
    });

    expect(provider.frameCount).toBe(1 as Num);

    cdp.emit('Page.screencastFrame' as Str, {
      data: 'BBBB',
      metadata: { pageScaleFactor: 1, deviceWidth: 1280, deviceHeight: 720 },
      sessionId: 2,
    });

    expect(provider.frameCount).toBe(2 as Num);
  });

  it('resets frame count on stop', async (): Promise<void> => {
    await provider.start(60 as Num);

    cdp.emit('Page.screencastFrame' as Str, {
      data: 'AAAA',
      metadata: { pageScaleFactor: 1, deviceWidth: 1280, deviceHeight: 720 },
      sessionId: 1,
    });

    expect(provider.frameCount).toBe(1 as Num);

    await provider.stop();
    expect(provider.frameCount).toBe(0 as Num);
  });

  it('can restart after stop', async (): Promise<void> => {
    await provider.start(60 as Num);
    await provider.stop();
    await provider.start(80 as Num);

    expect(provider.isRunning).toBe(true as Bool);
    // Second start should use new quality
    expect(cdp.send).toHaveBeenCalledWith('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      everyNthFrame: 1,
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Cursor polling                                                   */
  /* ---------------------------------------------------------------- */

  it('polls cursor style via Runtime.evaluate and sends cursor message', async (): Promise<void> => {
    cdp.send.mockImplementation((method: Str): unknown => {
      if (method === 'Runtime.evaluate') {
        return { result: { value: 'pointer' as Str } };
      }
      return undefined;
    });

    await provider.start(60 as Num);
    // Cursor poll happens every 1000ms
    await vi.advanceTimersByTimeAsync(1100);

    expect(cdp.send).toHaveBeenCalledWith('Runtime.evaluate', {
      expression:
        'getComputedStyle(document.body).cursor || document.body.style.cursor || "default"',
    });

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"cursor"') as unknown as string,
    );
  });

  it('does not send cursor message when cursor unchanged', async (): Promise<void> => {
    cdp.send.mockImplementation((method: Str): unknown => {
      if (method === 'Runtime.evaluate') {
        return { result: { value: 'default' as Str } };
      }
      return undefined;
    });

    await provider.start(60 as Num);
    await vi.advanceTimersByTimeAsync(1100);

    // "default" is the initial value, so no cursor message should be sent
    const cursorCalls: Num = ws.send.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === 'string' && (call[0] as string).includes('"type":"cursor"'),
    ).length as Num;
    expect(cursorCalls).toBe(0 as Num);
  });

  it('handles cursor poll failure gracefully', async (): Promise<void> => {
    cdp.send.mockImplementation((method: Str): unknown => {
      if (method === 'Runtime.evaluate') {
        throw new Error('Page navigating');
      }
      return undefined;
    });

    await provider.start(60 as Num);
    // Should not throw despite Runtime.evaluate failure
    await vi.advanceTimersByTimeAsync(1100);

    expect(provider.isRunning).toBe(true as Bool);
  });
});
