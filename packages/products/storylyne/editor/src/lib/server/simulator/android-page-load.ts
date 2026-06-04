/**
 * Android Page-Load Detection via CDP
 *
 * Polls for the `[data-lens-ready]` attribute on the page using Chrome
 * DevTools Protocol's `Runtime.evaluate` over an ADB-forwarded WebSocket.
 * Falls back to a fixed delay when CDP is not available.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { WebSocket } from 'ws';

// =============================================================================
// Constants
// =============================================================================

/** Poll interval in ms between readiness checks. */
const POLL_INTERVAL_MS: Num = 250 as Num;

/** Default timeout for page-load detection in ms. */
const DEFAULT_TIMEOUT_MS: Num = 10_000 as Num;

/** Fallback delay when CDP is not available. */
const FALLBACK_DELAY_MS: Num = 3000 as Num;

// =============================================================================
// Script & parsing
// =============================================================================

/**
 * Build JavaScript to check for `[data-lens-ready]` on the page.
 *
 * @returns {Str} JS expression string that evaluates to boolean
 *
 * @example
 * const script = buildReadyCheckScript();
 * // '!!document.querySelector("[data-lens-ready]")'
 */
export function buildReadyCheckScript(): Str {
  return '!!document.querySelector("[data-lens-ready]")' as Str;
}

/**
 * Parse a CDP `Runtime.evaluate` response to extract the boolean result.
 *
 * @param {Str} raw - Raw JSON string from CDP WebSocket
 * @returns {boolean} true if the evaluation returned true, false otherwise
 *
 * @example
 * const ready = parseEvalResponse('{"id":1,"result":{"result":{"type":"boolean","value":true}}}');
 * // true
 */
export function parseEvalResponse(raw: Str): boolean {
  try {
    const parsed: Record<string, unknown> = JSON.parse(raw as string) as Record<string, unknown>;
    const result: Record<string, unknown> = (parsed.result ?? {}) as Record<string, unknown>;
    const inner: Record<string, unknown> = (result.result ?? {}) as Record<string, unknown>;

    return inner.type === 'boolean' && inner.value === true;
  } catch {
    /* Invalid JSON */
    return false;
  }
}

// =============================================================================
// Page-load polling
// =============================================================================

/**
 * Wait for the page to be ready by polling via CDP Runtime.evaluate.
 *
 * Connects to Chrome's CDP WebSocket and repeatedly evaluates a script
 * checking for `[data-lens-ready]` until it returns true or timeout.
 *
 * @param {Str} wsUrl - CDP WebSocket URL for the target page
 * @param {Num} timeoutMs - Maximum wait time (default: 10_000ms)
 * @returns Promise that resolves when the page is ready or timeout
 *
 * @example
 * await waitForPageReady('ws://localhost:9222/devtools/page/ABC');
 */
export async function waitForPageReady(
  wsUrl: Str,
  timeoutMs: Num = DEFAULT_TIMEOUT_MS,
): Promise<void> {
  if (!wsUrl) {
    await fallbackDelay();
    return;
  }

  const target: EventTarget = new EventTarget();
  const script: Str = buildReadyCheckScript();
  let msgId: Num = 1 as Num;

  const ws: WebSocket = new WebSocket(wsUrl as string);

  ws.on('open', () => {
    /* Enable Runtime domain */
    ws.send(JSON.stringify({ id: msgId, method: 'Runtime.enable', params: {} }));
    msgId = ((msgId as number) + 1) as Num;

    /* Start polling with interval */
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      ws.send(
        JSON.stringify({
          id: msgId,
          method: 'Runtime.evaluate',
          params: { expression: script, returnByValue: true },
        }),
      );
      msgId = ((msgId as number) + 1) as Num;
    }, POLL_INTERVAL_MS as number);

    /* Store interval handle for cleanup via custom property */
    (ws as unknown as Record<string, ReturnType<typeof setInterval>>).__interval = interval;
  });

  ws.on('message', (data: Buffer | string) => {
    if (parseEvalResponse(data.toString() as Str)) {
      target.dispatchEvent(new Event('done'));
    }
  });

  ws.on('error', () => {
    target.dispatchEvent(new Event('done'));
  });

  ws.on('close', () => {
    target.dispatchEvent(new Event('done'));
  });

  const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
    target.dispatchEvent(new Event('done'));
  }, timeoutMs as number);

  await waitForEvent(target);

  /* Cleanup */
  clearTimeout(timeout);
  const storedInterval: ReturnType<typeof setInterval> | undefined = (
    ws as unknown as Record<string, ReturnType<typeof setInterval>>
  ).__interval;

  if (storedInterval) {
    clearInterval(storedInterval);
  }
  try {
    ws.close();
  } catch {
    /* Already closed */
  }
}

/**
 * Wait for page load with fallback.
 *
 * Uses CDP polling when a WebSocket URL is available, otherwise falls
 * back to a fixed 3-second delay.
 *
 * @param {Str} wsUrl - CDP WebSocket URL (empty string to use fallback)
 *
 * @example
 * await waitForPageLoad('ws://localhost:9222/devtools/page/ABC');
 * await waitForPageLoad(''); // 3s fallback
 */
export async function waitForPageLoad(wsUrl: Str): Promise<void> {
  if (wsUrl) {
    await waitForPageReady(wsUrl);
  } else {
    await fallbackDelay();
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Wait for a single 'done' event on an EventTarget.
 *
 * @param target - EventTarget to listen on
 * @returns Promise that resolves when the event fires
 */
function waitForEvent(target: EventTarget): Promise<void> {
  return new Promise<void>((resolve) => {
    target.addEventListener(
      'done',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Fixed delay fallback when CDP is not available.
 *
 * @returns Promise that resolves after FALLBACK_DELAY_MS
 */
function fallbackDelay(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, FALLBACK_DELAY_MS as number);
  });
}
