/**
 * iOS Simulator Console Capture via WebKit Inspector Protocol
 *
 * Connects to Safari in the iOS Simulator via ios-webkit-debug-proxy's
 * WebSocket interface and captures console messages using the WebKit
 * Inspector Protocol's `Console.enable` / `Console.messageAdded` events.
 *
 * This is an optional feature — if the debug proxy is not installed or
 * the connection fails, the screenshot API still works but returns
 * empty console logs.
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { WebSocket } from 'ws';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A console message captured from Safari via WebKit Inspector Protocol. */
export type CapturedConsoleMessage = {
  /** Console level: 'log', 'warning', 'error', 'debug', 'info'. */
  level: Str;
  /** Message text. */
  text: Str;
  /** Message source ('console-api', 'javascript', 'network', etc.). */
  source: Str;
  /** Page URL where the message originated. */
  url?: Str;
  /** Line number in the source file. */
  line?: number;
};

/** Formatted console entry matching the ScreenshotConsoleEntry shape. */
export type FormattedConsoleEntry = {
  /** Console level. */
  level: Str;
  /** Message text. */
  message: Str;
  /** Message source. */
  source: Str;
};

/* ------------------------------------------------------------------ */
/*  Message parsing                                                    */
/* ------------------------------------------------------------------ */

/**
 * Parse a WebKit Inspector Protocol message for console events.
 *
 * Looks for `Console.messageAdded` events and extracts the message
 * details. Returns `null` for non-console events or invalid JSON.
 *
 * @param rawMessage - Raw JSON string from the WebSocket
 * @returns Parsed console message, or null if not a console event
 *
 * @example
 * const msg = parseConsoleMessage('{"method":"Console.messageAdded","params":{...}}');
 */
export function parseConsoleMessage(rawMessage: Str): CapturedConsoleMessage | null {
  try {
    const parsed: Record<string, unknown> = JSON.parse(rawMessage as string) as Record<
      string,
      unknown
    >;

    if (parsed.method !== 'Console.messageAdded') return null;

    const params: Record<string, unknown> = (parsed.params ?? {}) as Record<string, unknown>;
    const message: Record<string, unknown> = (params.message ?? {}) as Record<string, unknown>;

    return {
      level: (message.level ?? 'log') as string as Str,
      text: (message.text ?? '') as string as Str,
      source: (message.source ?? 'console-api') as string as Str,
      url: message.url ? (message.url as string as Str) : undefined,
      line: typeof message.line === 'number' ? message.line : undefined,
    };
  } catch {
    /* Invalid JSON */
    return null;
  }
}

/**
 * Format captured console messages into the ScreenshotConsoleEntry shape.
 *
 * @param messages - Array of captured console messages
 * @returns Array of formatted entries matching the screenshot API response shape
 *
 * @example
 * const entries = formatConsoleMessages(captured);
 * // [{ level: 'log', message: 'Hello', source: 'console-api' }]
 */
export function formatConsoleMessages(messages: CapturedConsoleMessage[]): FormattedConsoleEntry[] {
  return messages.map(
    (msg: CapturedConsoleMessage): FormattedConsoleEntry => ({
      level: msg.level,
      message: msg.text,
      source: msg.source,
    }),
  );
}

/* ------------------------------------------------------------------ */
/*  WebSocket-based capture                                            */
/* ------------------------------------------------------------------ */

/**
 * Connect to a WebKit Inspector WebSocket and capture console messages.
 *
 * Opens a WebSocket to the debug proxy, sends `Console.enable`, and
 * collects all `Console.messageAdded` events until the connection is
 * closed or the timeout expires.
 *
 * @param wsUrl - WebSocket URL from the debug proxy's inspectable page
 * @param timeoutMs - Maximum time to capture (default: 5000ms)
 * @returns Array of captured console messages
 *
 * @example
 * const messages = await captureConsoleLogs('ws://localhost:27753/devtools/page/1', 5000);
 */
export async function captureConsoleLogs(
  wsUrl: Str,
  timeoutMs: Num = 5000 as Num,
): Promise<CapturedConsoleMessage[]> {
  const target: EventTarget = new EventTarget();
  const messages: CapturedConsoleMessage[] = [];

  const ws: WebSocket = new WebSocket(wsUrl as string);

  ws.on('open', () => {
    /* Enable console domain — sends { id, method, params } */
    ws.send(JSON.stringify({ id: 1, method: 'Console.enable', params: {} }));
  });

  ws.on('message', (data: Buffer | string) => {
    const raw: Str = data.toString() as Str;
    const msg: CapturedConsoleMessage | null = parseConsoleMessage(raw);
    if (msg) {
      messages.push(msg);
    }
  });

  ws.on('error', () => {
    target.dispatchEvent(new Event('done'));
  });

  ws.on('close', () => {
    target.dispatchEvent(new Event('done'));
  });

  /* Timeout safety net — also ends capture after the collection window */
  const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
    target.dispatchEvent(new Event('done'));
  }, timeoutMs as number);

  /* Wait for first 'done' event — addEventListener({ once: true }) ensures single resolve */
  await waitForEvent(target);

  /* Cleanup */
  clearTimeout(timeout);
  try {
    ws.close();
  } catch {
    /* Already closed */
  }

  return messages;
}

/**
 * Wait for a single 'done' event on an EventTarget.
 *
 * Uses `addEventListener` with `{ once: true }` to ensure the
 * promise resolves exactly once, satisfying the no-multiple-resolved rule.
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
 * Close a console capture session by disconnecting the WebSocket.
 *
 * This is a no-op if the WebSocket was already closed by timeout or error.
 * The `captureConsoleLogs` function handles its own cleanup via the
 * timeout mechanism.
 *
 * @returns void
 */
export function stopCapture(): void {
  /* Capture sessions are self-managing via timeout.
   * This function exists as a public API entry point
   * for future explicit cancellation support. */
}
