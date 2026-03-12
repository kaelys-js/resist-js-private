/**
 * Tests for the preview WebSocket Vite plugin.
 *
 * Tests query-param parsing and the server setup function
 * without starting a real HTTP server.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { Bool, Str } from '@/schemas/common';
import { PREVIEW_WS_PATH, parseSessionQuery, setupPreviewWs } from './vite-plugin-preview-ws';

/* Mock the ws package — hoisted above all imports by Vitest. */
vi.mock('ws', () => {
  /** Minimal mock WebSocketServer constructor. */
  class MockWebSocketServer {
    /** @returns Mock event listener registration */
    on = vi.fn();
  }
  return { WebSocketServer: MockWebSocketServer };
});

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe('PREVIEW_WS_PATH', (): void => {
  it('equals /api/lens/preview/ws', (): void => {
    expect(PREVIEW_WS_PATH).toBe('/api/lens/preview/ws' as Str);
  });
});

/* ------------------------------------------------------------------ */
/*  Query parsing                                                      */
/* ------------------------------------------------------------------ */

describe('parseSessionQuery', (): void => {
  it('parses a minimal valid query string', (): void => {
    const url: Str =
      '/api/lens/preview/ws?engine=chromium&component=button&width=1280&height=720' as Str;
    const result = parseSessionQuery(url);
    expect(result.ok).toBe(true as Bool);
    if (result.ok) {
      expect(result.data.engine).toBe('chromium' as Str);
      expect(result.data.component).toBe('button' as Str);
      expect(result.data.width).toBe(1280);
      expect(result.data.height).toBe(720);
      expect(result.data.quality).toBe(60); // default
    }
  });

  it('parses a full query with all optional fields', (): void => {
    const url: Str =
      '/api/lens/preview/ws?engine=webkit&component=badge&width=375&height=812&scale=3&quality=40&colorScheme=dark&device=iPhone+15+Pro' as Str;
    const result = parseSessionQuery(url);
    expect(result.ok).toBe(true as Bool);
    if (result.ok) {
      expect(result.data.engine).toBe('webkit' as Str);
      expect(result.data.scale).toBe(3);
      expect(result.data.quality).toBe(40);
      expect(result.data.colorScheme).toBe('dark' as Str);
      expect(result.data.device).toBe('iPhone 15 Pro' as Str);
    }
  });

  it('rejects missing required fields', (): void => {
    const url: Str = '/api/lens/preview/ws?engine=chromium' as Str;
    const result = parseSessionQuery(url);
    expect(result.ok).toBe(false as Bool);
  });

  it('rejects invalid engine', (): void => {
    const url: Str =
      '/api/lens/preview/ws?engine=netscape&component=button&width=800&height=600' as Str;
    const result = parseSessionQuery(url);
    expect(result.ok).toBe(false as Bool);
  });

  it('coerces numeric query params from strings', (): void => {
    const url: Str =
      '/api/lens/preview/ws?engine=firefox&component=card&width=1920&height=1080&quality=85' as Str;
    const result = parseSessionQuery(url);
    expect(result.ok).toBe(true as Bool);
    if (result.ok) {
      expect(result.data.width).toBe(1920);
      expect(result.data.height).toBe(1080);
      expect(result.data.quality).toBe(85);
    }
  });

  it('handles URL without query string', (): void => {
    const url: Str = '/api/lens/preview/ws' as Str;
    const result = parseSessionQuery(url);
    expect(result.ok).toBe(false as Bool);
  });
});

/* ------------------------------------------------------------------ */
/*  Server setup                                                       */
/* ------------------------------------------------------------------ */

describe('setupPreviewWs', (): void => {
  it('does not throw when httpServer is null', (): void => {
    const server = { httpServer: null } as never;
    expect((): void => setupPreviewWs(server)).not.toThrow();
  });

  it('attaches an upgrade listener to httpServer', (): void => {
    const httpServer = { on: vi.fn() };
    const server = { httpServer } as never;
    setupPreviewWs(server);
    expect(httpServer.on).toHaveBeenCalledWith('upgrade', expect.any(Function));
  });

  it('registers only one upgrade listener per call', (): void => {
    const httpServer = { on: vi.fn() };
    const server = { httpServer } as never;
    setupPreviewWs(server);
    const upgradeCalls = httpServer.on.mock.calls.filter(
      (call: unknown[]) => call[0] === 'upgrade',
    );
    expect(upgradeCalls).toHaveLength(1);
  });
});
