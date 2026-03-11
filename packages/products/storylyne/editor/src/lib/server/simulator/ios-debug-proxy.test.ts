/**
 * Tests for ios-webkit-debug-proxy management.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
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
  });
});
