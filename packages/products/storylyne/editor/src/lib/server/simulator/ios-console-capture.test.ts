/**
 * Tests for iOS Simulator console capture via WebKit Inspector Protocol.
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { describe, expect, it } from 'vitest';
import {
  type CapturedConsoleMessage,
  parseConsoleMessage,
  formatConsoleMessages,
} from './ios-console-capture';

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
});
