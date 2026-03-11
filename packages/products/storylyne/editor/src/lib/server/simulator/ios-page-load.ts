/**
 * iOS Simulator Page-Load Detection
 *
 * Detects when a page has finished loading in Safari via the WebKit
 * Inspector Protocol's `Runtime.evaluate`. Polls for the presence of
 * the `[data-lens-ready]` attribute on the document element, which
 * is set by the Lens isolate page when the component is fully rendered.
 *
 * Falls back to a fixed delay if the debug proxy is unavailable.
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import { WebSocket } from 'ws';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Poll interval for checking page readiness (ms). */
const POLL_INTERVAL_MS: Num = 250 as Num;

/** Default timeout for page-load detection (ms). */
const DEFAULT_TIMEOUT_MS: Num = 10_000 as Num;

/** Fallback delay when debug proxy is unavailable (ms). */
const FALLBACK_DELAY_MS: Num = 3000 as Num;

/* ------------------------------------------------------------------ */
/*  Script building                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build the JavaScript expression to check if the page is ready.
 *
 * Checks for `[data-lens-ready]` attribute on any element in the DOM.
 * Returns `true` if the element exists, `false` otherwise.
 *
 * @returns JavaScript expression string
 *
 * @example
 * const script = buildReadyCheckScript();
 * // "!!document.querySelector('[data-lens-ready]')"
 */
export function buildReadyCheckScript(): Str {
  return "!!document.querySelector('[data-lens-ready]')" as Str;
}

/* ------------------------------------------------------------------ */
/*  Response parsing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse a WebKit Inspector Runtime.evaluate response to extract the result.
 *
 * @param rawResponse - JSON string from the WebSocket
 * @returns `true` if the evaluation returned a truthy value
 *
 * @example
 * const ready = parseEvalResponse('{"id":1,"result":{"result":{"type":"boolean","value":true}}}');
 * // true
 */
export function parseEvalResponse(rawResponse: Str): boolean {
  try {
    const parsed: Record<string, unknown> = JSON.parse(rawResponse as string) as Record<
      string,
      unknown
    >;

    /* Check for error response */
    if ('error' in parsed) return false;

    const result: Record<string, unknown> = ((parsed.result as Record<string, unknown>) ?? {})
      .result as Record<string, unknown>;

    if (!result) return false;

    /* Boolean true */
    if (result.type === 'boolean' && result.value === true) return true;

    /* String "true" */
    if (result.type === 'string' && result.value === 'true') return true;

    return false;
  } catch {
    /* Invalid JSON */
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Page-load polling                                                  */
/* ------------------------------------------------------------------ */

/**
 * Wait for the page to finish loading by polling `[data-lens-ready]`.
 *
 * Connects to the WebKit Inspector Protocol via WebSocket and sends
 * `Runtime.evaluate` commands at regular intervals until the selector
 * matches or the timeout expires.
 *
 * @param wsUrl - WebSocket URL from the debug proxy's inspectable page
 * @param timeoutMs - Maximum wait time (default: 10000ms)
 * @returns `true` if page became ready, `false` if timed out
 *
 * @example
 * const ready = await waitForPageReady('ws://localhost:27753/devtools/page/1');
 * if (!ready) console.warn('Page load timed out');
 */
export async function waitForPageReady(
  wsUrl: Str,
  timeoutMs: Num = DEFAULT_TIMEOUT_MS,
): Promise<Bool> {
  const target: EventTarget = new EventTarget();
  let messageId: Num = 1 as Num;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const ws: WebSocket = new WebSocket(wsUrl as string);

  ws.on('open', () => {
    /* Start polling with Runtime.evaluate */
    const sendEvalCommand = (): void => {
      messageId = (messageId + 1) as Num;
      ws.send(
        JSON.stringify({
          id: messageId,
          method: 'Runtime.evaluate',
          params: {
            expression: buildReadyCheckScript() as string,
            returnByValue: true,
          },
        }),
      );
    };

    /* Send first check immediately */
    sendEvalCommand();

    /* Then poll at regular intervals */
    pollTimer = setInterval(sendEvalCommand, POLL_INTERVAL_MS as number);
  });

  ws.on('message', (data: Buffer | string) => {
    const raw: Str = data.toString() as Str;
    if (parseEvalResponse(raw)) {
      target.dispatchEvent(new CustomEvent('done', { detail: true }));
    }
  });

  ws.on('error', () => {
    target.dispatchEvent(new CustomEvent('done', { detail: false }));
  });

  ws.on('close', () => {
    target.dispatchEvent(new CustomEvent('done', { detail: false }));
  });

  /* Timeout safety net */
  const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
    target.dispatchEvent(new CustomEvent('done', { detail: false }));
  }, timeoutMs as number);

  /* Wait for first 'done' event — addEventListener + once ensures single resolve */
  const result: Bool = await waitForCustomEvent(target, 'done');

  /* Cleanup */
  clearTimeout(timeout);
  if (pollTimer) clearInterval(pollTimer);
  try {
    ws.close();
  } catch {
    /* Already closed */
  }

  return result;
}

/**
 * Wait for page load with fallback for when debug proxy is unavailable.
 *
 * If `wsUrl` is provided, uses WebSocket polling.
 * If `wsUrl` is empty/null, falls back to a fixed delay.
 *
 * @param wsUrl - WebSocket URL (empty string = use fallback delay)
 * @param timeoutMs - Maximum wait time for WebSocket polling
 * @returns `true` if page is ready (or fallback completed)
 *
 * @example
 * await waitForPageLoad('ws://localhost:27753/devtools/page/1');
 * await waitForPageLoad(''); // falls back to 3s delay
 */
export async function waitForPageLoad(
  wsUrl: Str,
  timeoutMs: Num = DEFAULT_TIMEOUT_MS,
): Promise<Bool> {
  if (!wsUrl) {
    /* No debug proxy — use fixed delay */
    await sleep(FALLBACK_DELAY_MS);
    return true as Bool;
  }

  return waitForPageReady(wsUrl, timeoutMs);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Wait for a single CustomEvent on an EventTarget.
 *
 * Uses `addEventListener` with `{ once: true }` to ensure the
 * promise resolves exactly once, satisfying the no-multiple-resolved rule.
 *
 * @param target - EventTarget to listen on
 * @param eventName - Event name to listen for
 * @returns The `detail` value from the CustomEvent, cast to Bool
 */
function waitForCustomEvent(target: EventTarget, eventName: Str): Promise<Bool> {
  return new Promise<Bool>((resolve) => {
    target.addEventListener(
      eventName as string,
      (evt: Event) => {
        /* CustomEvent.detail contains the boolean result */
        const detail: boolean = (evt as CustomEvent).detail as boolean;
        resolve(detail as Bool);
      },
      { once: true },
    );
  });
}

/**
 * Sleep for the specified duration.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: Num): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
