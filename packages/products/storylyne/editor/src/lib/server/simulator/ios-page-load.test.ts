/**
 * Tests for iOS Simulator page-load detection.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { Num, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReadyCheckScript, parseEvalResponse } from './ios-page-load';
import type * as IosPageLoadModule from './ios-page-load';

describe('ios-page-load', () => {
  describe('buildReadyCheckScript', () => {
    it('returns a JavaScript expression that checks data-lens-ready', () => {
      const script: Str = buildReadyCheckScript();
      expect(script).toContain('data-lens-ready');
      expect(script).toContain('querySelector');
    });
  });

  describe('parseEvalResponse', () => {
    it('returns true when result value is true', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'boolean',
            value: true,
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(true);
    });

    it('returns false when result value is false', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'boolean',
            value: false,
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(false);
    });

    it('returns false for null result', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'object',
            subtype: 'null',
            value: null,
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(false);
    });

    it('returns false for error responses', () => {
      const response: Str = JSON.stringify({
        id: 1,
        error: { code: -32_000, message: 'Cannot find context' },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(false);
    });

    it('returns false for invalid JSON', () => {
      expect(parseEvalResponse('not json' as Str)).toBe(false);
    });

    it('returns true for string "true" result', () => {
      const response: Str = JSON.stringify({
        id: 1,
        result: {
          result: {
            type: 'string',
            value: 'true',
          },
        },
      }) as Str;

      expect(parseEvalResponse(response)).toBe(true);
    });
  });

  describe('waitForPageReady / waitForPageLoad (mocked)', () => {
    class FakeSocket extends EventEmitter {
      public sent: string[] = [];
      public closed = false;
      public closeThrows = false;
      send(d: string): void {
        this.sent.push(d);
      }
      close(): void {
        if (this.closeThrows) {
          throw new Error('closed');
        }
        this.closed = true;
      }
    }
    const state = vi.hoisted(() => ({ socket: null as unknown as { new (url: string): unknown } }));
    vi.mock('ws', () => ({
      WebSocket: class {
        constructor(url: string) {
          if (!state.socket) {
            throw new Error('socket not set');
          }
          return new state.socket(url) as object;
        }
      },
    }));

    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    async function load(): Promise<typeof IosPageLoadModule> {
      vi.resetModules();
      return await import('./ios-page-load');
    }

    it('waitForPageLoad falls back to fixed delay when wsUrl is empty', async () => {
      const mod = await load();
      const p = mod.waitForPageLoad('' as Str);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(p).resolves.toBe(true);
    });

    it('waitForPageReady resolves true when message signals ready', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageReady('ws://x' as Str, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('open');
      // First poll immediate + interval tick
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({ id: 2, result: { result: { type: 'boolean', value: true } } }),
        ),
      );
      await expect(p).resolves.toBe(true);
      expect(sock.sent.length).toBeGreaterThanOrEqual(1);
      expect(sock.closed).toBe(true);
    });

    it('waitForPageReady resolves false on timeout', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageReady('ws://x' as Str, 1000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('open');
      await vi.advanceTimersByTimeAsync(1000);
      await expect(p).resolves.toBe(false);
    });

    it('waitForPageReady resolves false when ws errors', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageReady('ws://x' as Str, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('error', new Error('nope'));
      await expect(p).resolves.toBe(false);
    });

    it('waitForPageReady resolves false when ws closes', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageReady('ws://x' as Str, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('close');
      await expect(p).resolves.toBe(false);
    });

    it('waitForPageReady ignores messages where eval returns false', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageReady('ws://x' as Str, 500 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('open');
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({ id: 2, result: { result: { type: 'boolean', value: false } } }),
        ),
      );
      await vi.advanceTimersByTimeAsync(500);
      await expect(p).resolves.toBe(false);
    });

    it('waitForPageReady swallows close() throwing during cleanup', async () => {
      const sock = new FakeSocket();
      sock.closeThrows = true;
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageReady('ws://x' as Str, 500 as Num);
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(500);
      await expect(p).resolves.toBe(false);
    });

    it('waitForPageLoad delegates to waitForPageReady when wsUrl present', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageLoad('ws://x' as Str, 500 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('open');
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({ id: 2, result: { result: { type: 'boolean', value: true } } }),
        ),
      );
      await expect(p).resolves.toBe(true);
    });
  });
});
