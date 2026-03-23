/**
 * SvelteKit client-side error handler and console error logger.
 *
 * Handles uncaught client errors, resolves source maps for accurate
 * file/line/column display, and logs structured error details to the
 * browser console with colored grouping and cause chains.
 *
 * @module
 */

import * as v from 'valibot';
import type { HandleClientError } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { CapturedError } from '@/schemas/result/captured-error';
import type { Str, Num, Bool, Void } from '@/schemas/common';
import { ERRORS, err, type AppError } from '@/schemas/result/result';
import { setupLogging } from '@/utils/core/logger';
import { reportError, setupGlobalErrorHandling } from '@/utils/core/signal';
import { fromUnknownError, safeParse } from '@/utils/result/safe';
import { beaconError } from '@/utils/beacon/beacon';
import { initFetchBreadcrumbs } from '@/utils/beacon/breadcrumbs';
import { setupPerfume, type AnalyticsTrackerOptions } from '@/utils/web-vitals/perfume';
import { logVital, setVitalsLoggerAppName } from '@/utils/web-vitals/vitals-logger';
import { queueVital, setupVitalsBeacon, setDeviceInfo } from '@/utils/web-vitals/vitals-beacon';
import {
  initConnection,
  updateFromNavigatorInfo,
  getEffectiveType,
  getSaveData,
} from '@/utils/web-vitals/connection.svelte';
import type { VitalsMetric } from '@/utils/web-vitals/vitals-payload';
import { reportVitalToPanel } from '@/utils/web-vitals/vitals-panel-store.svelte';
import {
  setupDiagnosticObservers,
  collectDiagnostics,
  type VitalDiagnostics,
} from '@/utils/web-vitals/vitals-diagnostics';

setupLogging({ service: 'editor-client', initFromEnv: true });
setVitalsLoggerAppName('Storylyne');
initFetchBreadcrumbs();
setupGlobalErrorHandling({
  release: __APP_VERSION__,
  tags: { branch: __GIT_BRANCH__, side: 'client' },
  // Disable CSP capture in dev — CSP is intentionally off in dev mode
  // (svelte.config.js sets `csp = undefined` for dev), so any violations
  // come from browser extensions or external tools and are pure noise.
  captureCSP: !dev,
  onError: (captured) => {
    // Async fire-and-forget — resolves source maps before logging.
    // logErrorToConsole never rejects (internal try-catch), safe to ignore promise.
    logErrorToConsole(captured);
    // Beacon PII-stripped error to /api/errors (no-op in dev mode)
    beaconError(captured);
  },
});

// =============================================================================
// Web Vitals Collection (Perfume.js + beacon + connection)
// =============================================================================

// Initialize connection quality monitoring (reads navigator.connection)
initConnection();

// Set up vitals beacon (registers visibilitychange → flushVitals)
setupVitalsBeacon();

// Start diagnostic observers (long tasks, event timings) before metrics fire
setupDiagnosticObservers();

/** Tracks whether Perfume.js device info has been captured (reported once per page load). */
let deviceInfoCaptured: Bool = false;

/**
 * Perfume.js analytics tracker callback.
 *
 * Called once per metric (TTFB, FCP, LCP, CLS, INP, TBT, NTBT, navigationTiming,
 * networkInformation). Routes each metric to the console logger and beacon queue.
 * Captures device info on the first callback to populate connection store and
 * beacon payloads.
 *
 * @param options - Perfume.js analytics tracker options (metric data, rating, device info)
 * @returns `Void` — fire-and-forget, always succeeds
 */
function analyticsTracker(options: AnalyticsTrackerOptions): Void {
  const { metricName, data, rating, navigatorInformation, navigationType } = options;

  // Capture device info once — Perfume.js reports navigatorInformation with every callback
  if (!deviceInfoCaptured) {
    deviceInfoCaptured = true;
    updateFromNavigatorInfo(navigatorInformation);
    setDeviceInfo({
      isLowEndDevice: navigatorInformation.isLowEndDevice ?? false,
      isLowEndExperience: navigatorInformation.isLowEndExperience ?? false,
      deviceMemory: navigatorInformation.deviceMemory ?? 0,
      hardwareConcurrency: navigatorInformation.hardwareConcurrency ?? 0,
      effectiveType: getEffectiveType(),
      saveData: getSaveData(),
    });
  }

  // Skip non-vital meta-metrics (navigationTiming, networkInformation are objects, not numbers)
  if (typeof data !== 'number') return;

  // Null rating means Perfume.js didn't evaluate a threshold — default to 'good'
  const safeRating: VitalsMetric['rating'] = rating ?? 'good';

  // Collect diagnostics for non-good metrics (queries Performance APIs for attribution)
  const diagnostics: VitalDiagnostics | null = collectDiagnostics(metricName, data, safeRating);

  // Log to console (color-coded by rating in dev, warnings-only in prod)
  logVital(metricName, data, safeRating, diagnostics);

  // Queue for beacon (flushed on visibilitychange → hidden or at MAX_QUEUE_SIZE)
  queueVital({
    name: metricName,
    value: data,
    rating: safeRating,
    navigationType: navigationType ?? 'navigate',
  });

  // Feed dev toolbar performance panel (reactive $state store)
  reportVitalToPanel(metricName, data, safeRating, diagnostics);

  return undefined;
}

setupPerfume(analyticsTracker);

// =============================================================================
// Source Location Extraction
// =============================================================================

/** Schema for a parsed source location: display-friendly path, clickable URL, and raw position for source map resolution. */
const SourceLocationSchema = v.strictObject({
  /** Display-friendly path (e.g. `packages/editor/src/foo.ts:42:10`). */
  display: v.string(),
  /** Clickable URL with line:col (browser dev server). */
  url: v.optional(v.string()),
  /** Raw file URL (no line:col) for fetching the source map. */
  fileUrl: v.optional(v.string()),
  /** Generated line number (1-based) from the stack trace. */
  genLine: v.optional(v.number()),
  /** Generated column number (1-based) from the stack trace. */
  genCol: v.optional(v.number()),
});

/** Parsed source location. */
type SourceLocation = v.InferOutput<typeof SourceLocationSchema>;

/**
 * Extracts the first application-level source location from an AppError stack trace.
 *
 * Handles both Node.js filesystem paths and browser HTTP URLs (Vite dev server).
 * Skips internal frames (node_modules, node:internal, packages/shared/) and returns
 * the first frame that points to application source code.
 *
 * @param stack - The stack trace string from an AppError
 * @returns Display path + original clickable URL + raw position for source map resolution
 */
function extractSource(stack: Str): SourceLocation {
  const lines: Str[] = stack.split('\n');
  for (const line of lines) {
    const trimmed: Str = line.trim();
    if (!trimmed.startsWith('at ')) continue;
    // Skip internal frames — we want the application call site, not library internals
    if (trimmed.includes('node_modules') || trimmed.includes('node:internal')) continue;
    if (trimmed.includes('packages/shared/')) continue;

    // Browser URL (any format): http://host/path?query:line:col
    const urlMatch: RegExpMatchArray | null = trimmed.match(
      /(https?:\/\/[^/\s]+\/)(.+):(\d+):(\d+)/,
    );
    if (urlMatch) {
      const [, origin, rawUrlPath, lineNo, colNo] = urlMatch;
      // Strip query string (e.g., ?t=1772535466719)
      const qIdx: Num = rawUrlPath.indexOf('?');
      const urlPath: Str = qIdx >= 0 ? rawUrlPath.slice(0, qIdx) : rawUrlPath;
      // Build clickable URL (strip query string but keep origin + path + line:col)
      const clickableUrl: Str = `${origin}${urlPath}:${lineNo}:${colNo}`;
      // Full file URL for source map fetching (with query string for cache busting)
      const fileUrl: Str = `${origin}${rawUrlPath.split(':')[0]}`;
      const genLine: Num = Number(lineNo);
      const genCol: Num = Number(colNo);
      // Strip Vite @fs/ prefix to get filesystem path
      const fsPath: Str = urlPath.startsWith('@fs/') ? urlPath.slice(4) : urlPath;
      // Extract project-relative path from packages/ onward
      const pkgIdx: Num = fsPath.indexOf('packages/');
      if (pkgIdx >= 0) {
        return {
          display: `${fsPath.slice(pkgIdx)}:${lineNo}:${colNo}`,
          url: clickableUrl,
          fileUrl,
          genLine,
          genCol,
        };
      }
      if (urlPath.startsWith('src/')) {
        return {
          display: `${urlPath}:${lineNo}:${colNo}`,
          url: clickableUrl,
          fileUrl,
          genLine,
          genCol,
        };
      }
      return {
        display: `${urlPath}:${lineNo}:${colNo}`,
        url: clickableUrl,
        fileUrl,
        genLine,
        genCol,
      };
    }

    // Filesystem path (Node.js/SSR): /Users/.../packages/...:line:col
    const fsMatch: RegExpMatchArray | null = trimmed.match(/\(?(\/[^)]+):(\d+):(\d+)\)?$/);
    if (fsMatch) {
      const [, fullPath, lineNo, colNo] = fsMatch;
      const pkgIdx: Num = fullPath.indexOf('packages/');
      const relativePath: Str = pkgIdx >= 0 ? fullPath.slice(pkgIdx) : fullPath;
      return {
        display: `${relativePath}:${lineNo}:${colNo}`,
        url: undefined,
        fileUrl: undefined,
        genLine: undefined,
        genCol: undefined,
      };
    }
  }
  return {
    display: 'unknown',
    url: undefined,
    fileUrl: undefined,
    genLine: undefined,
    genCol: undefined,
  };
}

// =============================================================================
// Source Map Resolution (VLQ Decoder)
// =============================================================================

/** Base64 character set used by VLQ encoding in source maps. */
const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Regex to find the sourceMappingURL comment at the end of a JS file. */
const SOURCE_MAP_URL_RE = /\/\/[#@]\s*sourceMappingURL=(.+)$/m;

/** Schema for a minimal source map JSON shape (v3). */
const SourceMapV3Schema = v.strictObject({
  /** Source map version (must be 3). */
  version: v.number(),
  /** Array of original source file paths. */
  sources: v.array(v.string()),
  /** VLQ-encoded mapping string. */
  mappings: v.string(),
});

/** Minimal source map JSON shape (v3). */
type SourceMapV3 = v.InferOutput<typeof SourceMapV3Schema>;

/** Schema for a resolved original source position from a source map. */
const ResolvedPositionSchema = v.strictObject({
  /** Original source file path. */
  source: v.string(),
  /** Original line number (1-based). */
  line: v.number(),
  /** Original column number (1-based). */
  col: v.number(),
});

/** Resolved original source position from a source map. */
type ResolvedPosition = v.InferOutput<typeof ResolvedPositionSchema>;

/**
 * Decodes a Base64 VLQ-encoded string into an array of signed integers.
 *
 * Source maps encode each mapping segment as a sequence of VLQ values:
 * [generatedCol, sourceIdx, originalLine, originalCol, nameIdx?].
 * All values are delta-encoded relative to the previous segment.
 *
 * @param encoded - VLQ-encoded string (e.g., "AAAA", "gBACE")
 * @returns Array of decoded signed integers
 */
function decodeVLQ(encoded: Str): Num[] {
  const values: Num[] = [];
  let shift: Num = 0;
  let value: Num = 0;
  for (const char of encoded) {
    const digit: Num = VLQ_CHARS.indexOf(char);
    if (digit === -1) continue;
    const hasContinuation: Bool = (digit & 32) !== 0;
    value += (digit & 31) << shift;
    if (hasContinuation) {
      shift += 5;
    } else {
      const isNegative: Bool = (value & 1) !== 0;
      const decoded: Num = value >> 1;
      values.push(isNegative ? -decoded : decoded);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

/** Cache for fetched source maps to avoid re-fetching for multiple errors from same file. */
const _sourceMapCache: Map<Str, SourceMapV3 | null> = new Map<Str, SourceMapV3 | null>();

/**
 * Fetches and parses the source map for a given file URL.
 *
 * Looks for a `//# sourceMappingURL=` comment in the fetched JS file.
 * Supports both inline data URLs (base64) and external `.map` file URLs.
 * Results are cached by file URL.
 *
 * @param fileUrl - The URL of the compiled JS file
 * @returns Parsed source map, or null if unavailable
 */
async function fetchSourceMap(fileUrl: Str): Promise<SourceMapV3 | null> {
  if (_sourceMapCache.has(fileUrl)) return _sourceMapCache.get(fileUrl) ?? null;

  try {
    const response: Response = await fetch(fileUrl);
    if (!response.ok) {
      _sourceMapCache.set(fileUrl, null);
      return null;
    }
    const code: Str = await response.text();

    const match: RegExpMatchArray | null = code.match(SOURCE_MAP_URL_RE);
    if (!match) {
      _sourceMapCache.set(fileUrl, null);
      return null;
    }
    const mapUrl: Str = match[1].trim();

    let mapJson: Str;
    if (mapUrl.startsWith('data:')) {
      // Inline source map: data:application/json;base64,...
      const base64: Str = mapUrl.split(',')[1] ?? '';
      mapJson = atob(base64);
    } else {
      // External source map file
      const resolved: Str = new URL(mapUrl, fileUrl).href;
      const mapResponse: Response = await fetch(resolved);
      if (!mapResponse.ok) {
        _sourceMapCache.set(fileUrl, null);
        return null;
      }
      mapJson = await mapResponse.text();
    }

    const parseResult = safeParse(SourceMapV3Schema, JSON.parse(mapJson));
    if (!parseResult.ok) {
      _sourceMapCache.set(fileUrl, null);
      return null;
    }
    const map: SourceMapV3 = {
      version: parseResult.data.version,
      sources: [...parseResult.data.sources],
      mappings: parseResult.data.mappings,
    };
    if (map.version !== 3) {
      _sourceMapCache.set(fileUrl, null);
      return null;
    }

    _sourceMapCache.set(fileUrl, map);
    return map;
  } catch {
    _sourceMapCache.set(fileUrl, null);
    return null;
  }
}

/**
 * Resolves a generated position to the original source position using the source map.
 *
 * Decodes VLQ mappings line-by-line, maintaining delta state, then finds the segment
 * on the target line whose generated column is closest to (but not exceeding) the
 * target column.
 *
 * @param fileUrl - URL of the compiled JS file
 * @param genLine - Generated line number (1-based)
 * @param genCol - Generated column number (1-based)
 * @returns Original position with source file, line, and column; or null if unresolvable
 */
async function resolveSourcePosition(
  fileUrl: Str,
  genLine: Num,
  genCol: Num,
): Promise<ResolvedPosition | null> {
  const map: SourceMapV3 | null = await fetchSourceMap(fileUrl);
  if (!map) return null;

  const mappingLines: Str[] = map.mappings.split(';');
  if (genLine < 1 || genLine > mappingLines.length) return null;

  // Delta-encoded state that persists across all lines
  let sourceIndex: Num = 0;
  let originalLine: Num = 0;
  let originalCol: Num = 0;

  // Process all lines before the target to maintain delta state
  for (let i: Num = 0; i < genLine - 1; i++) {
    const lineMapping: Str = mappingLines[i] ?? '';
    if (!lineMapping) continue;
    const segments: Str[] = lineMapping.split(',');
    for (const segment of segments) {
      if (!segment) continue;
      const decoded: Num[] = decodeVLQ(segment);
      // decoded[0] = generated column delta (resets per line, but we don't need it here)
      if (decoded.length >= 4) {
        sourceIndex += decoded[1] ?? 0;
        originalLine += decoded[2] ?? 0;
        originalCol += decoded[3] ?? 0;
      }
    }
  }

  // Process the target line to find the best matching segment
  const targetLineMapping: Str = mappingLines[genLine - 1] ?? '';
  if (!targetLineMapping) return null;

  const targetSegments: Str[] = targetLineMapping.split(',');
  let genColAccum: Num = 0;
  let bestMatch: ResolvedPosition | null = null;

  for (const segment of targetSegments) {
    if (!segment) continue;
    const decoded: Num[] = decodeVLQ(segment);
    genColAccum += decoded[0] ?? 0;
    if (decoded.length >= 4) {
      sourceIndex += decoded[1] ?? 0;
      originalLine += decoded[2] ?? 0;
      originalCol += decoded[3] ?? 0;
    }
    // Generated column is 0-based in source maps, genCol from stack is 1-based
    if (genColAccum <= genCol - 1) {
      bestMatch = {
        source: map.sources[sourceIndex] ?? 'unknown',
        line: originalLine + 1, // Convert 0-based to 1-based
        col: originalCol + 1,
      };
    }
  }

  return bestMatch;
}

// =============================================================================
// Console Error Logging
// =============================================================================

/**
 * Logs a CapturedError to the browser console with colored grouping,
 * context table, cause chain, and validation details.
 *
 * Resolves source map positions for correct line/col numbers before logging.
 * Falls back to raw (compiled) positions if source map resolution fails.
 *
 * Used by the global `onError` handler for both uncaught errors and
 * SvelteKit `handleError` errors (routed through `reportError()`).
 *
 * @param captured - The CapturedError envelope containing the AppError + context
 */
async function logErrorToConsole(captured: CapturedError): Promise<Void> {
  const appError: AppError = captured.error;
  const label: Str = captured.type === 'resultError' ? 'Error' : 'Uncaught';
  const source: SourceLocation = extractSource(appError.stack);

  // Try to resolve original source position via source map
  if (source.fileUrl && source.genLine && source.genCol) {
    const resolved: ResolvedPosition | null = await resolveSourcePosition(
      source.fileUrl,
      source.genLine,
      source.genCol,
    );
    if (resolved) {
      // Extract short display path from resolved source
      const pkgIdx: Num = resolved.source.indexOf('packages/');
      const shortPath: Str =
        pkgIdx >= 0
          ? resolved.source.slice(pkgIdx)
          : resolved.source.replace(/^\.\.\//, '').replace(/^\.\//, '');
      source.display = `${shortPath}:${resolved.line}:${resolved.col}`;
    }
  }

  const pad: Num = 14;
  const dim: Str = 'color: #888';
  const bright: Str = 'color: #eee';

  console.groupCollapsed(
    `%c[${label}] %c${appError.code} %cat ${source.url ?? source.display} %c— ${appError.message}`,
    'color: #f44; font-weight: bold',
    'color: #fa0',
    'color: #8cf',
    'color: #aaa',
  );

  const entries: Array<[Str, Str]> = [
    ['Code', appError.code],
    ['Source', source.url ?? source.display],
    ['Message', appError.message],
    ['Error ID', appError.id],
    ['Capture ID', captured.id],
    ['Type', captured.type],
    ['Environment', captured.environment],
    ['Fatal', String(captured.fatal)],
    ['Severity', appError.severity ?? 'error'],
    ['URL', globalThis.location?.href ?? 'unknown'],
    ['Timestamp', appError.timestamp],
    ['Captured At', captured.timestamp],
  ];
  if (appError.httpStatus !== undefined) {
    entries.push(['HTTP', String(appError.httpStatus)]);
  }
  if (captured.fingerprint) {
    entries.push(['Fingerprint', captured.fingerprint.join(', ')]);
  }
  if (captured.release) {
    entries.push(['Release', captured.release]);
  }
  if (captured.serverName) {
    entries.push(['Server', captured.serverName]);
  }
  const fmt: Str = entries.map(([k]) => `%c  ${k.padEnd(pad)}%c%s`).join('\n');
  const kvArgs: Str[] = entries.flatMap(([, val]) => [dim, bright, val]);
  console.log(fmt, ...kvArgs);

  // Meta context (correlationId, log context, etc.)
  if (captured.meta && Object.keys(captured.meta).length > 0) {
    console.log('%cMeta:', 'color: #666; font-style: italic');
    console.log(captured.meta);
  }

  // Breadcrumbs
  if (captured.breadcrumbs && captured.breadcrumbs.length > 0) {
    console.log('%cBreadcrumbs:', 'color: #666; font-style: italic');
    console.log(captured.breadcrumbs);
  }

  // Tags
  if (captured.tags && Object.keys(captured.tags).length > 0) {
    console.log('%cTags:', 'color: #666; font-style: italic');
    console.log(captured.tags);
  }

  // User context
  if (captured.user) {
    console.log('%cUser:', 'color: #666; font-style: italic');
    console.log(captured.user);
  }

  // Structured contexts
  if (captured.contexts && Object.keys(captured.contexts).length > 0) {
    console.log('%cContexts:', 'color: #666; font-style: italic');
    console.log(captured.contexts);
  }

  // Help suggestion
  if (appError.help) {
    console.log('%cHelp: %c%s', 'color: #666; font-style: italic', 'color: #6c6', appError.help);
  }

  // Error source pointer
  if (appError.source) {
    console.log('%cSource pointer:', 'color: #666; font-style: italic');
    console.log(appError.source);
  }

  // Related errors
  if (appError.related && appError.related.length > 0) {
    console.log('%cRelated errors:', 'color: #666; font-style: italic');
    for (const rel of appError.related) {
      console.log(`  [${rel.code}] ${rel.message}`);
    }
  }

  // Raw error object
  console.log('%cRaw error:', 'color: #666; font-style: italic');
  console.log(captured.original);

  console.groupEnd();

  // Cause chain — top-level group so it can be expanded independently
  if (appError.cause) {
    console.groupCollapsed('%cCause chain', 'color: #888; font-style: italic');
    let current: AppError | undefined = appError.cause;
    let depth: Num = 0;
    while (current) {
      const indent: Str = '  '.repeat(depth);
      console.log(
        `${indent}%c[${current.code}]%c ${current.message}`,
        'color: #fa0',
        'color: inherit',
      );
      current = current.cause;
      depth++;
    }
    console.groupEnd();
  }

  // Validation details — top-level group, same key-value format as main entries + raw JSON
  if (appError.validation) {
    console.groupCollapsed(
      `%cValidation issues %cat ${source.url ?? source.display} %c— ${appError.message}`,
      'color: #f44; font-weight: bold',
      'color: #8cf',
      'color: #aaa',
    );
    const issues = appError.validation.issues ?? [];
    if (issues.length > 0) {
      const issueEntries: Array<[Str, Str]> = issues.map((issue) => {
        const path: Str =
          issue.path?.map((p: { key?: unknown }) => String(p.key ?? '?')).join('.') ?? '(root)';
        return [path, issue.message ?? 'Invalid'];
      });
      const issuePad: Num = Math.max(pad, ...issueEntries.map(([k]) => k.length + 2));
      const issueFmt: Str = issueEntries.map(([k]) => `%c  ${k.padEnd(issuePad)}%c%s`).join('\n');
      const issueArgs: Str[] = issueEntries.flatMap(([, val]) => [dim, bright, val]);
      console.log(issueFmt, ...issueArgs);
    }
    console.log('%cRaw:', 'color: #666; font-style: italic');
    console.log(appError.validation);
    console.groupEnd();
  }
}

// =============================================================================
// SvelteKit Client Error Handler
// =============================================================================

/**
 * Handles unexpected client errors by extracting or creating a structured AppError.
 *
 * If the thrown error is already an AppError (e.g., from a failed `safeParse` or `err()` call),
 * it is preserved as-is — its code, validation details, and cause chain remain intact.
 * Otherwise, the error is wrapped in a new `INTERNAL.UNEXPECTED` AppError.
 *
 * @param params - Error event containing the error, status, and message
 * @param params.error - The thrown error object (may be an AppError or a plain Error)
 * @param params.status - HTTP status code
 * @param params.message - User-safe error message from SvelteKit
 * @returns App.Error with message and errorId for client display
 *
 * @example
 * // SvelteKit calls this automatically for unhandled client errors
 * // The returned object becomes `page.error` in +error.svelte
 */
export const handleError: HandleClientError = ({ error, status, message }) => {
  // Extract or wrap the thrown error into an AppError.
  // fromUnknownError returns the AppError as-is if it already is one,
  // otherwise wraps it in INTERNAL.UNEXPECTED.
  const extracted: AppError = fromUnknownError(error);

  // If the extracted error is a generic INTERNAL.UNEXPECTED, wrap it with request context.
  // Otherwise it's already a domain-specific AppError — use it directly.
  let appError: AppError;
  if (extracted.code === ERRORS.INTERNAL.UNEXPECTED) {
    const result = err(
      ERRORS.INTERNAL.UNEXPECTED,
      `Unexpected client error (${status}): ${message}`,
      {
        cause: extracted,
        meta: { status, message },
      },
    );
    // err() always returns ok:false — narrow for type safety.
    if (result.ok) return { message, errorId: '' };
    appError = result.error;
  } else {
    appError = extracted;
  }

  // Route through CapturedError pipeline — reportError() wraps the AppError
  // with breadcrumbs, fingerprint, environment, etc. and fires onError which
  // calls logErrorToConsole with the full CapturedError.
  // literal false — reportError expects Bool alias, not bare boolean
  reportError(appError, false as Bool);

  return { message, errorId: appError.id };
};
