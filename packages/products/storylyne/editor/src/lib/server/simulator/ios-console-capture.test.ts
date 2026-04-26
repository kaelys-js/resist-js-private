/**
 * Tests for iOS Simulator console capture via WebKit Inspector Protocol.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { Num, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CapturedConsoleMessage,
  parseConsoleMessage,
  formatConsoleMessages,
  stopCapture,
} from './ios-console-capture';
import type * as IosConsoleCaptureModule from './ios-console-capture';

describe('ios-console-capture', () => {
  describe('parseConsoleMessage', () => {
    it('parses a Console.messageAdded event', () => {
      const event: Record<string, unknown> = {
        method: 'Console.messageAdded',
        params: {
          message: {
            level: 'log',
            text: 'Hello world',
            source: 'console-api',
            url: 'http://localhost:3100/isolate/button',
            line: 42,
          },
        },
      };

      const msg: CapturedConsoleMessage | null = parseConsoleMessage(JSON.stringify(event) as Str);
      expect(msg).not.toBeNull();
      expect(msg?.level).toBe('log');
      expect(msg?.text).toBe('Hello world');
      expect(msg?.source).toBe('console-api');
      expect(msg?.url).toBe('http://localhost:3100/isolate/button');
      expect(msg?.line).toBe(42);
    });

    it('parses warning level', () => {
      const event: Record<string, unknown> = {
        method: 'Console.messageAdded',
        params: {
          message: {
            level: 'warning',
            text: 'Deprecation notice',
            source: 'console-api',
          },
        },
      };

      const msg: CapturedConsoleMessage | null = parseConsoleMessage(JSON.stringify(event) as Str);
      expect(msg?.level).toBe('warning');
    });

    it('parses error level', () => {
      const event: Record<string, unknown> = {
        method: 'Console.messageAdded',
        params: {
          message: {
            level: 'error',
            text: 'Something broke',
            source: 'javascript',
          },
        },
      };

      const msg: CapturedConsoleMessage | null = parseConsoleMessage(JSON.stringify(event) as Str);
      expect(msg?.level).toBe('error');
    });

    it('returns null for non-console events', () => {
      const event: Record<string, unknown> = {
        method: 'Page.loadEventFired',
        params: { timestamp: 12_345 },
      };

      const msg: CapturedConsoleMessage | null = parseConsoleMessage(JSON.stringify(event) as Str);
      expect(msg).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const msg: CapturedConsoleMessage | null = parseConsoleMessage('not json' as Str);
      expect(msg).toBeNull();
    });
  });

  describe('formatConsoleMessages', () => {
    it('formats messages into the ScreenshotConsoleEntry shape', () => {
      const messages: CapturedConsoleMessage[] = [
        {
          level: 'log' as Str,
          text: 'Hello' as Str,
          source: 'console-api' as Str,
          url: 'http://localhost:3100/' as Str,
          line: 1,
        },
        {
          level: 'error' as Str,
          text: 'Oops' as Str,
          source: 'javascript' as Str,
          url: 'http://localhost:3100/' as Str,
          line: 5,
        },
      ];

      const formatted = formatConsoleMessages(messages);
      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toEqual({
        level: 'log',
        message: 'Hello',
        source: 'console-api',
      });
      expect(formatted[1]).toEqual({
        level: 'error',
        message: 'Oops',
        source: 'javascript',
      });
    });

    it('returns empty array for empty input', () => {
      const formatted = formatConsoleMessages([]);
      expect(formatted).toEqual([]);
    });
  });

  describe('stopCapture', () => {
    it('is a no-op and returns undefined', () => {
      expect(stopCapture()).toBeUndefined();
    });
  });

  describe('parseConsoleMessage — defaults', () => {
    it('applies defaults when message object omits fields', () => {
      const raw: Str = JSON.stringify({
        method: 'Console.messageAdded',
        params: { message: {} },
      }) as Str;
      const m = parseConsoleMessage(raw);
      expect(m).toEqual({
        level: 'log',
        text: '',
        source: 'console-api',
        url: undefined,
        line: undefined,
      });
    });

    it('omits url/line when non-string/non-number', () => {
      const raw: Str = JSON.stringify({
        method: 'Console.messageAdded',
        params: { message: { text: 'x', line: 'not-a-number' } },
      }) as Str;
      const m = parseConsoleMessage(raw);
      expect(m?.url).toBeUndefined();
      expect(m?.line).toBeUndefined();
    });
  });

  describe('captureConsoleLogs (mocked)', () => {
    class FakeSocket extends EventEmitter {
      public sent: string[] = [];
      public closed = false;
      public closeThrows = false;
      send(d: string): void {
        this.sent.push(d);
      }
      close(): void {
        if (this.closeThrows) {
          throw new Error('x');
        }
        this.closed = true;
      }
    }
    const state = vi.hoisted(() => ({ socket: null as unknown as { new (u: string): unknown } }));
    vi.mock('ws', () => ({
      WebSocket: class {
        constructor(url: string) {
          if (!state.socket) {
            throw new Error('no socket');
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

    async function load(): Promise<typeof IosConsoleCaptureModule> {
      vi.resetModules();
      return await import('./ios-console-capture');
    }

    it('sends Console.enable on open and collects messages until timeout', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.captureConsoleLogs('ws://x' as Str, 500 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('open');
      sock.emit(
        'message',
        Buffer.from(
          JSON.stringify({
            method: 'Console.messageAdded',
            params: { message: { level: 'log', text: 'hi', source: 'console-api' } },
          }),
        ),
      );
      sock.emit('message', Buffer.from('not-json'));
      sock.emit(
        'message',
        Buffer.from(JSON.stringify({ method: 'Page.loadEventFired', params: {} })),
      );
      await vi.advanceTimersByTimeAsync(500);
      const msgs = await p;
      expect(sock.sent[0]).toContain('Console.enable');
      expect(msgs).toHaveLength(1);
      expect(msgs[0]?.text).toBe('hi');
      expect(sock.closed).toBe(true);
    });

    it('returns [] when ws emits error', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.captureConsoleLogs('ws://x' as Str, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('error', new Error('x'));
      await expect(p).resolves.toEqual([]);
    });

    it('returns [] when ws emits close', async () => {
      const sock = new FakeSocket();
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.captureConsoleLogs('ws://x' as Str, 5000 as Num);
      await Promise.resolve();
      await Promise.resolve();
      sock.emit('close');
      await expect(p).resolves.toEqual([]);
    });

    it('swallows close() throwing during cleanup', async () => {
      const sock = new FakeSocket();
      sock.closeThrows = true;
      state.socket = class {
        constructor() {
          return sock;
        }
      } as never;
      const mod = await load();
      const p = mod.captureConsoleLogs('ws://x' as Str, 500 as Num);
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(500);
      await expect(p).resolves.toEqual([]);
    });
  });
});
