/**
 * Chrome DevTools Protocol over ADB
 *
 * Connects to Chrome on the Android emulator via `adb forward` and
 * WebSocket to use CDP for console capture (`Log.enable`, `Log.entryAdded`)
 * and page-load detection (`Runtime.evaluate`).
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WebSocket } from 'ws';

const execFileAsync = promisify(execFile);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A parsed CDP response or event message. */
export type CdpMessage = {
  /** Request ID (present for responses). */
  id?: Num;
  /** Method name (present for events). */
  method?: Str;
  /** Result data (present for responses). */
  result?: Record<string, unknown>;
  /** Event params (present for events). */
  params?: Record<string, unknown>;
};

/** A console log entry captured via CDP Log.entryAdded events. */
export type CdpConsoleEntry = {
  /** Log level: 'error', 'warning', 'info', 'verbose'. */
  level: Str;
  /** Log message text. */
  text: Str;
  /** Source of the log entry. */
  source: Str;
};

/* ------------------------------------------------------------------ */
/*  CDP port                                                           */
/* ------------------------------------------------------------------ */

/** Default local port for CDP forwarding. */
const CDP_LOCAL_PORT: Num = 9222 as Num;

/* ------------------------------------------------------------------ */
/*  ADB forwarding                                                     */
/* ------------------------------------------------------------------ */

/**
 * Build `adb forward` arguments for Chrome DevTools Protocol.
 *
 * Forwards a local TCP port to Chrome's Unix domain socket on the device.
 *
 * @param {Str} serial - Emulator serial (e.g. 'emulator-5554')
 * @param {Num} localPort - Local TCP port (default: 9222)
 * @returns {Str[]} Array of adb forward arguments
 *
 * @example
 * const args = buildAdbForwardArgs('emulator-5554');
 * // ['-s', 'emulator-5554', 'forward', 'tcp:9222', 'localabstract:chrome_devtools_remote']
 */
export function buildAdbForwardArgs(serial: Str, localPort: Num = CDP_LOCAL_PORT): Str[] {
  return [
    '-s',
    serial,
    'forward',
    `tcp:${localPort}`,
    'localabstract:chrome_devtools_remote',
  ] as Str[];
}

/**
 * Set up ADB port forwarding for CDP access.
 *
 * @param {Str} adbPath - Path to `adb` binary
 * @param {Str} serial - Emulator serial
 * @param {Num} localPort - Local TCP port (default: 9222)
 *
 * @example
 * await setupCdpForward('/path/to/adb', 'emulator-5554');
 */
export async function setupCdpForward(
  adbPath: Str,
  serial: Str,
  localPort: Num = CDP_LOCAL_PORT,
): Promise<void> {
  const args: Str[] = buildAdbForwardArgs(serial, localPort);
  await execFileAsync(adbPath as string, args as string[]);
}

/* ------------------------------------------------------------------ */
/*  CDP message parsing                                                */
/* ------------------------------------------------------------------ */

/**
 * Parse a raw CDP WebSocket message.
 *
 * @param {Str} raw - Raw JSON string from the WebSocket
 * @returns {CdpMessage | null} Parsed CDP message, or null if invalid
 *
 * @example
 * const msg = parseCdpResponse('{"id":1,"result":{}}');
 */
export function parseCdpResponse(raw: Str): CdpMessage | null {
  try {
    const parsed: Record<string, unknown> = JSON.parse(raw as string) as Record<string, unknown>;

    return {
      id: typeof parsed.id === 'number' ? (parsed.id as Num) : undefined,
      method: typeof parsed.method === 'string' ? (parsed.method as Str) : undefined,
      result: (parsed.result as Record<string, unknown>) ?? undefined,
      params: (parsed.params as Record<string, unknown>) ?? undefined,
    };
  } catch {
    /* Invalid JSON */
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  CDP capture                                                        */
/* ------------------------------------------------------------------ */

/**
 * Connect to Chrome via CDP and capture console log entries.
 *
 * Sends `Log.enable` and collects `Log.entryAdded` events until timeout.
 *
 * @param {Num}alPort - Local TCP port with CDP forwarding (default: 9222)
 * @param {Num} timeoutMs - Capture duration in ms (default: 5000)
 * @returns {Promise<CdpConsoleEntry[]>} Array of captured console entries
 *
 * @example
 * const logs = await captureConsoleLogs(9222, 5000);
 * @param {Num} localPort - Description
 */
export async function captureConsoleLogs(
  localPort: Num = CDP_LOCAL_PORT,
  timeoutMs: Num = 5000 as Num,
): Promise<CdpConsoleEntry[]> {
  const entries: CdpConsoleEntry[] = [];
  const target: EventTarget = new EventTarget();

  /** Fetch the WebSocket debugger URL from Chrome's /json endpoint. */
  let wsUrl: Str;
  try {
    const response: Response = await fetch(`http://localhost:${localPort}/json`);
    const targets: unknown[] = (await response.json()) as unknown[];
    const page: Record<string, unknown> | undefined = (
      targets as Array<Record<string, unknown>>
    ).find((t: Record<string, unknown>): boolean => t.type === 'page');
    if (!page?.webSocketDebuggerUrl) {
      return entries;
    }
    wsUrl = page.webSocketDebuggerUrl as Str;
  } catch {
    /* Chrome not reachable via CDP */
    return entries;
  }

  const ws: WebSocket = new WebSocket(wsUrl as string);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'Log.enable', params: {} }));
  });

  ws.on('message', (data: Buffer | string) => {
    const msg: CdpMessage | null = parseCdpResponse(data.toString() as Str);
    if (!msg) {
      return;
    }

    if (msg.method === 'Log.entryAdded' && msg.params) {
      const entry: Record<string, unknown> = (msg.params.entry ?? {}) as Record<string, unknown>;
      entries.push({
        level: (entry.level ?? 'info') as string as Str,
        text: (entry.text ?? '') as string as Str,
        source: (entry.source ?? 'other') as string as Str,
      });
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

  await waitForCdpEvent(target);

  clearTimeout(timeout);
  try {
    ws.close();
  } catch {
    /* Already closed */
  }

  return entries;
}

/**
 * Wait for a single 'done' event on an EventTarget.
 *
 * @param target - EventTarget to listen on
 * @returns Promise that resolves when the event fires
 */
function waitForCdpEvent(target: EventTarget): Promise<void> {
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
