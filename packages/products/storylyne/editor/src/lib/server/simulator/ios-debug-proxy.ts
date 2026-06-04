/**
 * ios-webkit-debug-proxy Management
 *
 * Manages the ios-webkit-debug-proxy process for WebKit remote debugging
 * of Safari in iOS Simulator. Provides install detection, process lifecycle
 * management, and inspectable page discovery.
 *
 * This is an OPTIONAL dependency — if not installed, iOS screenshots still
 * work but without console capture or smart page-load detection (falls
 * back to a fixed delay).
 *
 * @module
 */

import type { Bool, Num, Str } from '@/schemas/common';
import { type ChildProcess, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// =============================================================================
// Types
// =============================================================================

/** A page visible in the debug proxy's inspectable targets list. */
export type InspectablePage = {
  /** Page title. */
  title: Str;
  /** Page URL. */
  url: Str;
  /** WebSocket URL for the WebKit Inspector Protocol. */
  webSocketDebuggerUrl: Str;
};

// =============================================================================
// Singleton state
// =============================================================================

/** Running debug proxy process (if any). */
let proxyProcess: ChildProcess | null = null;

/** Port the debug proxy is listening on. */
let proxyPort: Num = 0 as Num;

/** Default debug proxy port. */
const DEFAULT_PROXY_PORT: Num = 27_753 as Num;

// =============================================================================
// Detection
// =============================================================================

/**
 * Check if ios-webkit-debug-proxy is installed.
 *
 * @returns {Promise<Bool>} `true` if the binary is found on PATH
 *
 * @example
 * const installed = await isDebugProxyInstalled();
 * if (!installed) console.log('Install with: brew install ios-webkit-debug-proxy');
 */
export async function isDebugProxyInstalled(): Promise<Bool> {
  try {
    await execFileAsync('which', ['ios_webkit_debug_proxy']);
    return true as Bool;
  } catch {
    /* Not found on PATH */
    return false as Bool;
  }
}

// =============================================================================
// Process lifecycle
// =============================================================================

/**
 * Build command-line arguments for ios_webkit_debug_proxy.
 *
 * @param {Str} udid - Device UDID to proxy
 * @param {number} port - Port to listen on (default: 27753)
 * @returns {Str[]} Array of CLI arguments
 *
 * @example
 * const args = buildProxyArgs('ABCD-1234');
 * // ['-c', 'ABCD-1234:27753', '-F']
 */
export function buildProxyArgs(udid: Str, port: number = DEFAULT_PROXY_PORT as number): Str[] {
  return ['-c', `${udid}:${port}`, '-F'] as Str[];
}

/**
 * Start the ios-webkit-debug-proxy for a specific simulator UDID.
 *
 * If a proxy is already running, this stops it first.
 *
 * @param {Str} udid - Device UDID to proxy
 * @param {Num} port - Port to listen on (default: 27753)
 * @returns {Promise<Bool>} `true` if proxy started successfully
 * @throws If ios_webkit_debug_proxy is not installed
 *
 * @example
 * await startDebugProxy('B33CE7D0-3CD7-4BB9-AEDC-0D5679F6D0C0');
 */
export async function startDebugProxy(udid: Str, port: Num = DEFAULT_PROXY_PORT): Promise<Bool> {
  /* Stop any existing proxy */
  if (proxyProcess) {
    stopDebugProxy();
  }

  const installed: Bool = await isDebugProxyInstalled();

  if (!installed) {
    throw new Error(
      'ios_webkit_debug_proxy is not installed. Install with: brew install ios-webkit-debug-proxy',
    );
  }

  const args: Str[] = buildProxyArgs(udid, port as number);

  proxyProcess = spawn('ios_webkit_debug_proxy', args as string[], {
    stdio: 'ignore',
    detached: false,
  });
  proxyPort = port;

  /* Give proxy time to start listening */
  await sleep(1000 as Num);

  return true as Bool;
}

/**
 * Stop the running ios-webkit-debug-proxy process.
 *
 * Idempotent — does nothing if no proxy is running.
 *
 * @returns {Bool} `true` when proxy is stopped
 */
export function stopDebugProxy(): Bool {
  if (proxyProcess) {
    proxyProcess.kill('SIGTERM');
    proxyProcess = null;
    proxyPort = 0 as Num;
  }
  return true as Bool;
}

/**
 * Check if the debug proxy is currently running.
 *
 * @returns {Bool} `true` if proxy process exists and hasn't exited
 */
export function isProxyRunning(): Bool {
  if (!proxyProcess) {
    return false as Bool;
  }
  return (proxyProcess.exitCode === null) as Bool;
}

/**
 * Get the port the debug proxy is listening on.
 *
 * @returns {Num} Port number, or 0 if not running
 */
export function getProxyPort(): Num {
  return proxyPort;
}

// =============================================================================
// Inspectable pages
// =============================================================================

/**
 * Parse a JSON string of inspectable pages from the debug proxy.
 *
 * The debug proxy exposes a REST endpoint at `http://localhost:<port>/json`
 * that returns an array of inspectable targets. This function parses
 * that response.
 *
 * @param {Str} json - JSON string from the debug proxy's /json endpoint
 * @returns {InspectablePage[]} Array of inspectable page descriptors
 *
 * @example
 * const response = await fetch('http://localhost:27753/json');
 * const pages = parseInspectablePages(await response.text());
 */
export function parseInspectablePages(json: Str): InspectablePage[] {
  try {
    const parsed: unknown = JSON.parse(json as string);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry: unknown): entry is Record<string, unknown> => {
        return typeof entry === 'object' && entry !== null && 'url' in entry;
      })
      .map(
        (entry: Record<string, unknown>): InspectablePage => ({
          title: (entry.title ?? '') as string as Str,
          url: (entry.url ?? '') as string as Str,
          webSocketDebuggerUrl: (entry.webSocketDebuggerUrl ?? '') as string as Str,
        }),
      );
  } catch {
    /* Invalid JSON — return empty */
    return [];
  }
}

/**
 * Fetch inspectable pages from the running debug proxy.
 *
 * @param {Num} port - Debug proxy port (default: uses current proxy port)
 * @returns {Promise<InspectablePage[]>} Array of inspectable pages, or empty if proxy is not reachable
 *
 * @example
 * const pages = await getInspectablePages();
 * const isolatePage = pages.find(p => p.url.includes('/isolate/'));
 */
export async function getInspectablePages(port: Num = proxyPort): Promise<InspectablePage[]> {
  if (port === 0) {
    return [];
  }

  try {
    const response: Response = await fetch(`http://localhost:${port}/json`);

    if (!response.ok) {
      return [];
    }

    const text: Str = (await response.text()) as Str;

    return parseInspectablePages(text);
  } catch {
    /* Proxy not reachable */
    return [];
  }
}

// =============================================================================
// Helpers
// =============================================================================

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
