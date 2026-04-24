/**
 * Tests for ios-webkit-debug-proxy management.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { Num, Str } from '@/schemas/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProxyArgs, parseInspectablePages, type InspectablePage } from './ios-debug-proxy';

describe('ios-debug-proxy', () => {
  describe('buildProxyArgs', () => {
    it('builds default args for a UDID', () => {
      const udid: Str = 'ABCD-1234' as Str;
      const args: Str[] = buildProxyArgs(udid);
      expect(args).toContain('-c');
      expect(args).toContain('-F');
      expect(args.some((a) => (a as string).includes('ABCD-1234:'))).toBe(true);
      expect(args.some((a) => (a as string).includes(':27753'))).toBe(true);
    });

    it('uses custom port when specified', () => {
      const udid: Str = 'ABCD-1234' as Str;
      const args: Str[] = buildProxyArgs(udid, 9300);
      expect(args.some((a) => (a as string).includes(':9300'))).toBe(true);
    });
  });

  describe('parseInspectablePages', () => {
    it('parses JSON array of inspectable pages', () => {
      const json: Str = JSON.stringify([
        {
          devtoolsFrontendUrl: '',
          faviconUrl: '',
          thumbnailUrl: '',
          title: 'Test Page',
          type: 'page',
          url: 'http://localhost:3100/isolate/button',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
      ]) as Str;

      const pages: InspectablePage[] = parseInspectablePages(json);
      expect(pages).toHaveLength(1);
      expect(pages[0]?.title).toBe('Test Page');
      expect(pages[0]?.url).toBe('http://localhost:3100/isolate/button');
      expect(pages[0]?.webSocketDebuggerUrl).toBe('ws://localhost:9222/devtools/page/1');
    });

    it('returns empty array for invalid JSON', () => {
      const pages: InspectablePage[] = parseInspectablePages('not json' as Str);
      expect(pages).toEqual([]);
    });

    it('returns empty array for empty JSON array', () => {
      const pages: InspectablePage[] = parseInspectablePages('[]' as Str);
      expect(pages).toEqual([]);
    });

    it('filters to pages matching a URL pattern', () => {
      const json: Str = JSON.stringify([
        {
          title: 'Google',
          url: 'https://google.com',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/1',
        },
        {
          title: 'Button Isolate',
          url: 'http://localhost:3100/isolate/button',
          webSocketDebuggerUrl: 'ws://localhost:9222/devtools/page/2',
        },
      ]) as Str;

      const pages: InspectablePage[] = parseInspectablePages(json);
      const matching: InspectablePage[] = pages.filter((p: InspectablePage): boolean =>
        (p.url as string).includes('/isolate/'),
      );
      expect(matching).toHaveLength(1);
      expect(matching[0]?.title).toBe('Button Isolate');
    });

    it('filters out non-object entries', () => {
      const json: Str = JSON.stringify([null, 42, 'str', { other: 'x' }]) as Str;
      expect(parseInspectablePages(json)).toEqual([]);
    });

    it('returns [] when JSON is not an array', () => {
      expect(parseInspectablePages('{"x":1}' as Str)).toEqual([]);
    });

    it('applies empty-string defaults for missing fields', () => {
      const json: Str = JSON.stringify([{ url: 'http://x' }]) as Str;
      const pages = parseInspectablePages(json);
      expect(pages[0]?.title).toBe('');
      expect(pages[0]?.webSocketDebuggerUrl).toBe('');
      expect(pages[0]?.url).toBe('http://x');
    });
  });

  describe('lifecycle + fetching (mocked)', () => {
    class FakeChild extends EventEmitter {
      public killed = false;
      public exitCode: number | null = null;
      kill(): void {
        this.killed = true;
      }
    }
    const state = vi.hoisted(() => ({
      whichOk: true,
      spawnRes: null as FakeChild | null,
      fetchImpl: null as ((url: string) => Promise<unknown>) | null,
    }));
    vi.mock('node:child_process', () => ({
      default: {
        execFile: (
          _f: string,
          _a: readonly string[],
          cb: (e: Error | null, r?: unknown) => void,
        ) => {
          if (state.whichOk) cb(null, { stdout: '/usr/bin/x', stderr: '' });
          else cb(new Error('not found'));
          return null;
        },
        spawn: () => state.spawnRes ?? new FakeChild(),
      },
      execFile: (_f: string, _a: readonly string[], cb: (e: Error | null, r?: unknown) => void) => {
        if (state.whichOk) cb(null, { stdout: '/usr/bin/x', stderr: '' });
        else cb(new Error('not found'));
        return null;
      },
      spawn: () => state.spawnRes ?? new FakeChild(),
    }));

    beforeEach(() => {
      vi.useFakeTimers();
      state.whichOk = true;
      state.spawnRes = null;
      state.fetchImpl = null;
      vi.stubGlobal('fetch', (url: string) =>
        state.fetchImpl ? state.fetchImpl(url) : Promise.reject(new Error('no fetch')),
      );
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    async function load(): Promise<typeof import('./ios-debug-proxy')> {
      vi.resetModules();
      return await import('./ios-debug-proxy');
    }

    it('isDebugProxyInstalled returns true when which succeeds', async () => {
      const mod = await load();
      await expect(mod.isDebugProxyInstalled()).resolves.toBe(true);
    });

    it('isDebugProxyInstalled returns false when which fails', async () => {
      state.whichOk = false;
      const mod = await load();
      await expect(mod.isDebugProxyInstalled()).resolves.toBe(false);
    });

    it('startDebugProxy throws when not installed', async () => {
      state.whichOk = false;
      const mod = await load();
      await expect(mod.startDebugProxy('UDID' as Str)).rejects.toThrow(
        /ios_webkit_debug_proxy is not installed/,
      );
    });

    it('startDebugProxy spawns and records port; isProxyRunning true; getProxyPort returns port', async () => {
      const child = new FakeChild();
      state.spawnRes = child;
      const mod = await load();
      const p = mod.startDebugProxy('UDID' as Str, 9300 as Num);
      await vi.advanceTimersByTimeAsync(1000);
      await expect(p).resolves.toBe(true);
      expect(mod.isProxyRunning()).toBe(true);
      expect(mod.getProxyPort()).toBe(9300);
    });

    it('startDebugProxy stops existing proxy first', async () => {
      const first = new FakeChild();
      state.spawnRes = first;
      const mod = await load();
      const p1 = mod.startDebugProxy('UDID' as Str, 9301 as Num);
      await vi.advanceTimersByTimeAsync(1000);
      await p1;
      const second = new FakeChild();
      state.spawnRes = second;
      const p2 = mod.startDebugProxy('UDID' as Str, 9302 as Num);
      await vi.advanceTimersByTimeAsync(1000);
      await p2;
      expect(first.killed).toBe(true);
    });

    it('stopDebugProxy is a no-op when not running', async () => {
      const mod = await load();
      expect(mod.stopDebugProxy()).toBe(true);
      expect(mod.isProxyRunning()).toBe(false);
      expect(mod.getProxyPort()).toBe(0);
    });

    it('isProxyRunning returns false after exitCode is set', async () => {
      const child = new FakeChild();
      state.spawnRes = child;
      const mod = await load();
      const p = mod.startDebugProxy('UDID' as Str);
      await vi.advanceTimersByTimeAsync(1000);
      await p;
      child.exitCode = 0;
      expect(mod.isProxyRunning()).toBe(false);
    });

    it('getInspectablePages returns [] when port is 0', async () => {
      const mod = await load();
      await expect(mod.getInspectablePages(0 as Num)).resolves.toEqual([]);
    });

    it('getInspectablePages returns [] when fetch rejects', async () => {
      state.fetchImpl = () => Promise.reject(new Error('ECONNREFUSED'));
      const mod = await load();
      await expect(mod.getInspectablePages(27_753 as Num)).resolves.toEqual([]);
    });

    it('getInspectablePages returns [] when response.ok is false', async () => {
      state.fetchImpl = () =>
        Promise.resolve({ ok: false, text: async () => '[]' } as unknown as Response);
      const mod = await load();
      await expect(mod.getInspectablePages(27_753 as Num)).resolves.toEqual([]);
    });

    it('getInspectablePages parses valid response', async () => {
      state.fetchImpl = () =>
        Promise.resolve({
          ok: true,
          text: async () =>
            JSON.stringify([{ title: 'T', url: 'http://u', webSocketDebuggerUrl: 'ws://w' }]),
        } as unknown as Response);
      const mod = await load();
      const pages = await mod.getInspectablePages(27_753 as Num);
      expect(pages).toHaveLength(1);
      expect(pages[0]?.title).toBe('T');
    });
  });
});
