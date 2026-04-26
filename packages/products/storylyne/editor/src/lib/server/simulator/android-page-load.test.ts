/**
 * Tests for Android page-load detection via CDP.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { Num, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReadyCheckScript, parseEvalResponse } from './android-page-load';
import type * as AndroidPageLoadModule from './android-page-load';

describe('android-page-load', () => {
  describe('buildReadyCheckScript', () => {
    it('returns a JS expression checking data-lens-ready', () => {
      const script: Str = buildReadyCheckScript();
      expect(script).toContain('data-lens-ready');
      expect(script).toContain('querySelector');
    });
  });

  describe('parseEvalResponse', () => {
    it('returns true when result value is true', () => {
      const raw: Str = JSON.stringify({
        id: 1,
        result: { result: { type: 'boolean', value: true } },
      }) as Str;
      expect(parseEvalResponse(raw)).toBe(true);
    });

    it('returns false when result value is false', () => {
      const raw: Str = JSON.stringify({
        id: 1,
        result: { result: { type: 'boolean', value: false } },
      }) as Str;
      expect(parseEvalResponse(raw)).toBe(false);
    });

    it('returns false for invalid JSON', () => {
      expect(parseEvalResponse('bad json' as Str)).toBe(false);
    });

    it('returns false for missing result', () => {
      const raw: Str = JSON.stringify({ id: 1 }) as Str;
      expect(parseEvalResponse(raw)).toBe(false);
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
    const state = vi.hoisted(() => ({ socket: null as unknown as { new (u: string): unknown } }));
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

    async function load(): Promise<typeof AndroidPageLoadModule> {
      vi.resetModules();
      return await import('./android-page-load');
    }

    it('waitForPageReady falls back when wsUrl is empty', async () => {
      const mod = await load();
      const p = mod.waitForPageReady('' as Str);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(p).resolves.toBeUndefined();
    });

    it('waitForPageLoad falls back when wsUrl is empty', async () => {
      const mod = await load();
      const p = mod.waitForPageLoad('' as Str);
      await vi.advanceTimersByTimeAsync(3000);
      await expect(p).resolves.toBeUndefined();
    });

    it('waitForPageReady sends Runtime.enable on open and resolves on ready message', async () => {
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
      // Advance past the poll interval so at least one evaluate fires.
      await vi.advanceTimersByTimeAsync(250);
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({ id: 2, result: { result: { type: 'boolean', value: true } } }),
        ),
      );
      await expect(p).resolves.toBeUndefined();
      expect(sock.sent[0]).toContain('Runtime.enable');
      expect(sock.closed).toBe(true);
    });

    it('waitForPageReady resolves on timeout', async () => {
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
      await vi.advanceTimersByTimeAsync(500);
      await expect(p).resolves.toBeUndefined();
    });

    it('waitForPageReady resolves on ws error', async () => {
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
      sock.emit('error', new Error('x'));
      await expect(p).resolves.toBeUndefined();
    });

    it('waitForPageReady resolves on ws close', async () => {
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
      await expect(p).resolves.toBeUndefined();
    });

    it('waitForPageReady swallows close() throw during cleanup', async () => {
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
      await expect(p).resolves.toBeUndefined();
    });

    it('waitForPageLoad delegates to waitForPageReady when wsUrl present', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.waitForPageLoad('ws://x' as Str);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('open');
      await vi.advanceTimersByTimeAsync(250);
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({ id: 2, result: { result: { type: 'boolean', value: true } } }),
        ),
      );
      await expect(p).resolves.toBeUndefined();
    });

    it('ignores messages where eval returns false', async () => {
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
      await expect(p).resolves.toBeUndefined();
    });
  });
});
