/**
 * Tests for Chrome DevTools Protocol over ADB.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Num, Str } from '@/schemas/common';
import {
  buildAdbForwardArgs,
  parseCdpResponse,
  type CdpConsoleEntry,
  type CdpMessage,
} from './android-cdp';

describe('android-cdp', () => {
  describe('buildAdbForwardArgs', () => {
    it('builds adb forward args for CDP with default port', () => {
      const args: Str[] = buildAdbForwardArgs('emulator-5554' as Str);
      expect(args).toEqual([
        '-s',
        'emulator-5554',
        'forward',
        'tcp:9222',
        'localabstract:chrome_devtools_remote',
      ]);
    });

    it('honours a custom local port', () => {
      const args: Str[] = buildAdbForwardArgs('emulator-5556' as Str, 9333 as Num);
      expect(args[3]).toBe('tcp:9333');
      expect(args[1]).toBe('emulator-5556');
    });

    it('always returns 5 elements', () => {
      expect(buildAdbForwardArgs('emulator-x' as Str)).toHaveLength(5);
    });
  });

  describe('parseCdpResponse', () => {
    it('parses a CDP result response with id + result', () => {
      const raw: Str = JSON.stringify({
        id: 1,
        result: { result: { type: 'boolean', value: true } },
      }) as Str;

      const parsed: CdpMessage | null = parseCdpResponse(raw);
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe(1);
      expect(parsed?.result).toEqual({ result: { type: 'boolean', value: true } });
      expect(parsed?.method).toBeUndefined();
      expect(parsed?.params).toBeUndefined();
    });

    it('parses event messages with method + params', () => {
      const raw: Str = JSON.stringify({
        method: 'Log.entryAdded',
        params: { entry: { level: 'error', text: 'Oops' } },
      }) as Str;

      const parsed: CdpMessage | null = parseCdpResponse(raw);
      expect(parsed?.method).toBe('Log.entryAdded');
      expect(parsed?.id).toBeUndefined();
      expect(parsed?.params).toBeDefined();
    });

    it('coerces non-numeric id to undefined', () => {
      const msg: CdpMessage | null = parseCdpResponse('{"id":"five"}' as Str);
      expect(msg?.id).toBeUndefined();
    });

    it('coerces non-string method to undefined', () => {
      const msg: CdpMessage | null = parseCdpResponse('{"method":42}' as Str);
      expect(msg?.method).toBeUndefined();
    });

    it('returns null for invalid JSON', () => {
      expect(parseCdpResponse('not json' as Str)).toBeNull();
      expect(parseCdpResponse('' as Str)).toBeNull();
      expect(parseCdpResponse('{' as Str)).toBeNull();
    });

    it('returns an empty message for bare {} JSON', () => {
      const msg: CdpMessage | null = parseCdpResponse('{}' as Str);
      expect(msg).not.toBeNull();
      expect(msg?.id).toBeUndefined();
      expect(msg?.method).toBeUndefined();
      expect(msg?.result).toBeUndefined();
      expect(msg?.params).toBeUndefined();
    });
  });

  /* -----------------------------------------------------------------------
   * Mocked captureConsoleLogs — WebSocket + fetch with hoisted state.
   * -------------------------------------------------------------------- */
  describe('captureConsoleLogs (mocked)', () => {
    type LoadedModule = typeof import('./android-cdp');

    class FakeSocket extends EventEmitter {
      public sent: string[] = [];
      public closed = false;
      public closeThrows = false;
      send(data: string): void {
        this.sent.push(data);
      }
      close(): void {
        if (this.closeThrows) throw new Error('close failed');
        this.closed = true;
      }
    }

    const state = vi.hoisted(() => ({
      socketFactory: null as ((url: string) => unknown) | null,
    }));

    vi.mock('ws', () => ({
      WebSocket: class {
        constructor(url: string) {
          if (!state.socketFactory) throw new Error('socketFactory not set');
          return state.socketFactory(url) as object;
        }
      },
    }));

    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      state.socketFactory = null;
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    async function loadMod(): Promise<LoadedModule> {
      vi.resetModules();
      return (await import('./android-cdp')) as LoadedModule;
    }

    it('returns [] when fetch rejects', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const mod = await loadMod();
      const entries = await mod.captureConsoleLogs(9222 as Num, 100 as Num);
      expect(entries).toEqual([]);
    });

    it('returns [] when no page target is found', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => [{ type: 'iframe' }, { type: 'worker' }],
      });
      const mod = await loadMod();
      const entries = await mod.captureConsoleLogs(9222 as Num, 100 as Num);
      expect(entries).toEqual([]);
    });

    it('returns [] when page target has no webSocketDebuggerUrl', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => [{ type: 'page' }],
      });
      const mod = await loadMod();
      const entries = await mod.captureConsoleLogs(9222 as Num, 100 as Num);
      expect(entries).toEqual([]);
    });

    it('sends Log.enable on open and captures Log.entryAdded events', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => [{ type: 'page', webSocketDebuggerUrl: 'ws://localhost:9222/page/1' }],
      });
      const sock = new FakeSocket();
      state.socketFactory = () => sock;

      const mod = await loadMod();
      const promise = mod.captureConsoleLogs(9222 as Num, 5000 as Num);

      // Flush microtasks so ws listeners are attached before emitting.
      await Promise.resolve();
      await Promise.resolve();

      sock.emit('open');
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({
            method: 'Log.entryAdded',
            params: { entry: { level: 'error', text: 'boom', source: 'console-api' } },
          }),
        ),
      );
      // Non-Log event: ignored.
      sock.emit('message', Buffer.from(JSON.stringify({ method: 'Other.event', params: {} })));
      // Malformed JSON → parseCdpResponse returns null, handler bails.
      sock.emit('message', Buffer.from('not-json'));
      // Log entry with missing fields → defaults applied.
      sock.emit(
        'message',
        Buffer.from(JSON.stringify({ method: 'Log.entryAdded', params: { entry: {} } })),
      );

      vi.advanceTimersByTime(5000);

      const entries: CdpConsoleEntry[] = await promise;
      expect(sock.sent).toEqual([JSON.stringify({ id: 1, method: 'Log.enable', params: {} })]);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ level: 'error', text: 'boom', source: 'console-api' });
      expect(entries[1]).toEqual({ level: 'info', text: '', source: 'other' });
      expect(sock.closed).toBe(true);
    });

    it('resolves early when ws emits error', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => [{ type: 'page', webSocketDebuggerUrl: 'ws://x' }],
      });
      const sock = new FakeSocket();
      state.socketFactory = () => sock;
      const mod = await loadMod();
      const promise = mod.captureConsoleLogs(9222 as Num, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('error', new Error('ws broke'));
      const entries = await promise;
      expect(entries).toEqual([]);
    });

    it('resolves early when ws emits close', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => [{ type: 'page', webSocketDebuggerUrl: 'ws://x' }],
      });
      const sock = new FakeSocket();
      state.socketFactory = () => sock;
      const mod = await loadMod();
      const promise = mod.captureConsoleLogs(9222 as Num, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('close');
      const entries = await promise;
      expect(entries).toEqual([]);
    });

    it('swallows close() throwing during cleanup', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => [{ type: 'page', webSocketDebuggerUrl: 'ws://x' }],
      });
      const sock = new FakeSocket();
      sock.closeThrows = true;
      state.socketFactory = () => sock;
      const mod = await loadMod();
      const promise = mod.captureConsoleLogs(9222 as Num, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(5000);
      await expect(promise).resolves.toEqual([]);
    });
  });
});
