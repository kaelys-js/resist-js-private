/**
 * Vite plugin for Live View preview WebSocket.
 *
 * Intercepts HTTP upgrade requests at {@link PREVIEW_WS_PATH} on the
 * dev server, parses session configuration from query parameters, and
 * hands the connection off to a `ws` WebSocket server running in
 * `noServer` mode. Each accepted connection becomes a preview session
 * managed by the preview session manager.
 *
 * Only active during `vite dev` (`apply: 'serve'`).
 *
 * @module
 */

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ViteDevServer } from 'vite';
import type { Num, Str } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { log } from '@/utils/core/logger';
import { SessionConfigSchema, type SessionConfig } from './preview-types';

// =============================================================================
// Constants
// =============================================================================

/** WebSocket endpoint path for Live View preview sessions. */
export const PREVIEW_WS_PATH: Str = '/api/lens/preview/ws' as Str;

// =============================================================================
// Query parsing
// =============================================================================

/**
 * Parse and validate session configuration from a request URL's query string.
 *
 * Extracts query parameters, coerces numeric values from strings,
 * and validates against {@link SessionConfigSchema}.
 *
 * @param {Str} url - Request URL path with query string (e.g., `/api/lens/preview/ws?engine=chromium&...`)
 * @returns {Result<SessionConfig>} Result containing the validated SessionConfig or a validation error
 *
 * @example
 * const result = parseSessionQuery('/api/lens/preview/ws?engine=chromium&component=button&width=1280&height=720');
 * if (result.ok) {
 *   console.log(result.data.engine); // 'chromium'
 * }
 */
export function parseSessionQuery(url: Str): Result<SessionConfig> {
  const parsed: URL = new URL(url as string, 'http://localhost');
  const params: URLSearchParams = parsed.searchParams;

  /** Numeric fields that must be coerced from query-string strings. */
  const numericFields: Str[] = ['width', 'height', 'scale', 'quality'] as Str[];

  const raw: Record<string, unknown> = {};

  for (const [key, value] of params.entries()) {
    if ((numericFields as string[]).includes(key) && value !== '') {
      const num: Num = Number(value) as Num;

      if (Number.isNaN(num as number)) {
        raw[key] = value;
      } else {
        raw[key] = num;
      }
    } else {
      raw[key] = value;
    }
  }

  return safeParse(SessionConfigSchema, raw);
}

// =============================================================================
// Server setup
// =============================================================================

/**
 * Set up the Live View preview WebSocket on a Vite dev server.
 *
 * Attaches to the dev server's HTTP `upgrade` event and routes
 * connections at {@link PREVIEW_WS_PATH} through a `ws` server.
 * Non-matching upgrade requests are left untouched for Vite's
 * own HMR WebSocket.
 *
 * Called from the Vite config's lazy plugin wrapper via dynamic import,
 * so `@/` aliases are resolved by the time this runs.
 *
 * @param {ViteDevServer} server - Vite dev server instance
 *
 * @example
 * // Inside a Vite plugin's configureServer hook:
 * const { setupPreviewWs } = await import('./vite-plugin-preview-ws.js');
 * setupPreviewWs(server);
 */
export function setupPreviewWs(server: ViteDevServer): void {
  if (server.httpServer === null) {
    log.warn('lens-preview-ws: httpServer is null (middleware mode) — plugin disabled');
    return;
  }

  /** WebSocket server in noServer mode — upgrades handled manually. */
  const wsServer: WebSocketServer = new WebSocketServer({ noServer: true });

  wsServer.on('connection', (ws: WebSocket, config: SessionConfig): void => {
    log.info('Preview session connected', {
      engine: config.engine,
      component: config.component,
      viewport: `${config.width}x${config.height}`,
    });

    // P2 will wire PreviewSessionManager.createSession(ws, config) here

    ws.on('close', (): void => {
      log.info('Preview session disconnected', { component: config.component });
    });
  });

  server.httpServer.on(
    'upgrade',
    (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
      const url: Str = (request.url ?? '') as Str;
      const parsed: URL = new URL(url as string, 'http://localhost');

      if (parsed.pathname !== (PREVIEW_WS_PATH as string)) {
        // Not our path — leave for Vite HMR or other handlers
        return;
      }

      const result: Result<SessionConfig> = parseSessionQuery(url);

      if (!result.ok) {
        log.warn('Preview WS: invalid session config', { url, error: result.error.message });
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      wsServer.handleUpgrade(request, socket, head, (ws: WebSocket): void => {
        wsServer.emit('connection', ws, result.data);
      });
    },
  );

  log.info(`Preview WebSocket plugin active at ${PREVIEW_WS_PATH}`);
}
