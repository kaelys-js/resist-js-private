/**
 * Debug Service Orchestrator
 *
 * Single entry point that conditionally starts/stops all debug services
 * based on `debugStore.debug.enabled`. Call once in `+layout.svelte`
 * after both stores are initialized.
 *
 * When `debug.enabled` transitions:
 *   - `false → true`:  create state logger + register window global devtools API
 *   - `true → false`:  destroy state logger + remove window global
 *
 * @module
 */

// Debug console output stays English-only — it targets developer DevTools,
// not end users, and console.log %c styling doesn't support locale functions.

import { styles } from '$lib/debug/console-styles';
import { createStateLogger } from '$lib/debug/state-logger.svelte';
import {
  createDevtoolsAPI,
  DEVTOOLS_KEY,
  type EditorDevtools,
} from '$lib/debug/devtools-api.svelte';
import { APP_NAME, URL_PARAM_PREFIX } from '$lib/config/app-meta';
import { getBuildInfo } from '$lib/config/build-info';
import type { Bool, Str, Void } from '@/schemas/common';
import { isValidAppKey, isValidFeatureFlag } from '$lib/utils/url-params';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';

// =============================================================================
// Types
// =============================================================================

/** Handle returned by `activateDebugServices` for cleanup. */
export type DebugServicesHandle = {
  /** Destroys all active debug services. */
  destroy(): Void;
};

// =============================================================================
// Activation / Deactivation
// =============================================================================

/**
 * Activates debug services — creates state logger and devtools API.
 * Returns a handle to destroy all services.
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @returns Handle with `destroy()` method
 *
 * @example
 * ```typescript
 * const handle = activateDebugServices(editorStore, debugStore);
 * // window[DEVTOOLS_KEY] is now available
 * handle.destroy(); // removes everything
 * ```
 */
export function activateDebugServices(
  editorStore: EditorStore,
  debugStore: DebugStore,
): DebugServicesHandle {
  const loggerCleanup = createStateLogger(editorStore, debugStore);
  const devtoolsCleanup = createDevtoolsAPI(editorStore, debugStore);

  logWelcomeBanner(editorStore, debugStore);

  return {
    destroy(): Void {
      loggerCleanup.destroy();
      devtoolsCleanup.destroy();

      console.log(`%c ${APP_NAME} %c Debug mode disabled`, styles.debugBadge, styles.reset);
    },
  };
}

// =============================================================================
// Welcome Banner
// =============================================================================

/** Feature flag override prefix within URL_PARAM_PREFIX params. */
const FF_PREFIX = 'ff.';

/**
 * Checks whether a URL override key is recognized by the system.
 * Recognized keys: `debug`, `logLevel`, valid app preference keys, `ff.<validFlag>`.
 *
 * @param key - Unprefixed override key (e.g., 'debug', 'theme', 'ff.settings')
 * @returns True if the key maps to a known store setter
 */
function isRecognizedOverrideKey(key: Str): Bool {
  if (key === 'debug' || key === 'logLevel') return true;
  if (key.startsWith(FF_PREFIX)) {
    return isValidFeatureFlag(key.slice(FF_PREFIX.length));
  }
  return isValidAppKey(key);
}

/**
 * Logs a rich welcome banner to the console when debug mode activates.
 * Shows app info, current state summary, available commands, and URL param usage.
 *
 * @param editorStore - The editor state store (for current state info)
 * @param debugStore - The debug state store (for log level info)
 */

// ── Badge styles (inline — each section has a unique color) ───────────
const BADGE_STATE =
  'background:#1a3a4a;color:#8cf;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_FLAGS =
  'background:#1a3a2a;color:#8f8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_OVERRIDES =
  'background:#3a3a1a;color:#fc8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_BUILD =
  'background:#2a2a1a;color:#fd8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_API =
  'background:#2a1a3a;color:#c8f;padding:1px 6px;border-radius:3px;font-weight:bold';

/**
 * Builds a single formatted log string from key-value pairs.
 * All pairs are joined with newlines so the browser renders one console entry.
 *
 * @param entries - Array of `[key, value]` pairs
 * @param pad - Padding width for the key column
 * @returns Tuple of `[formatString, ...styleArgs]` for `console.log`
 */
function buildKVBlock(entries: Array<[Str, Str]>, pad = 14): [Str, ...Str[]] {
  const parts: Str[] = [];
  const styleArgs: Str[] = [];
  for (const [key, value] of entries) {
    parts.push(`  %c${key.padEnd(pad)}%c ${value}`);
    styleArgs.push(styles.keyLabel, styles.valueText);
  }
  return [parts.join('\n'), ...styleArgs];
}

function logWelcomeBanner(editorStore: EditorStore, debugStore: DebugStore): Void {
  const globalName = `window.${DEVTOOLS_KEY}`;
  const { logLevel } = debugStore.debug;
  const { features } = editorStore;
  const overrides: Record<Str, Str> = debugStore.urlOverrides;
  const overrideKeys: Str[] = Object.keys(overrides);

  // ── Header ────────────────────────────────────────────────────
  console.log(`%c[${APP_NAME}] %cDebug mode enabled`, 'color:#8cf;font-weight:bold', 'color:#aaa');

  // ── Build Info (gold badge) ───────────────────────────────────
  const buildResult = getBuildInfo();
  if (buildResult.ok) {
    const b = buildResult.data;
    console.groupCollapsed(`%c ${APP_NAME} · Build Info `, BADGE_BUILD);
    const buildBlock = buildKVBlock([
      ['version', b.version],
      ['commit', b.commit],
      ['branch', b.branch],
      ['dirty', b.dirty ? 'Yes' : 'No'],
      ['built', b.buildTimestamp],
    ]);
    console.log(...buildBlock);
    console.groupEnd();
  }

  // ── Current State (teal badge) — delegates to logState() ─────
  console.groupCollapsed(`%c ${APP_NAME} · Current State `, BADGE_STATE);
  const devtools = (window as unknown as Record<Str, EditorDevtools | undefined>)[DEVTOOLS_KEY];
  if (devtools) {
    devtools.logState();
  }
  console.groupEnd();

  // ── Feature Flags (green badge) ───────────────────────────────
  console.groupCollapsed(`%c ${APP_NAME} · Feature Flags `, BADGE_FLAGS);
  const flagEntries: Array<[Str, Str]> = Object.entries(features).map(([key, val]) => [
    key,
    String(val),
  ]);
  const flagsBlock = buildKVBlock(flagEntries, 20);
  console.log(...flagsBlock);
  console.groupEnd();

  // ── URL Overrides (amber badge) ───────────────────────────────
  if (overrideKeys.length > 0) {
    const validKeys: Str[] = [];
    const unknownKeys: Str[] = [];
    for (const key of overrideKeys) {
      if (isRecognizedOverrideKey(key)) {
        validKeys.push(key);
      } else {
        unknownKeys.push(key);
      }
    }

    const suffix = `${validKeys.length} applied${unknownKeys.length > 0 ? `, ${unknownKeys.length} unknown` : ''}`;
    console.groupCollapsed(
      `%c ${APP_NAME} · URL Overrides %c ${suffix}`,
      BADGE_OVERRIDES,
      'color:#aaa',
    );
    if (validKeys.length > 0) {
      const validEntries: Array<[Str, Str]> = validKeys.map((key) => [
        `${URL_PARAM_PREFIX}${key}`,
        overrides[key] ?? '',
      ]);
      const validBlock = buildKVBlock(validEntries, 20);
      console.log(...validBlock);
    }
    for (const key of unknownKeys) {
      console.warn(`  ✗ ${URL_PARAM_PREFIX}${key} = ${overrides[key]}  (unknown — ignored)`);
    }
    console.groupEnd();
  }

  // ── Devtools API (purple badge) ───────────────────────────────
  console.groupCollapsed(`%c ${APP_NAME} · Devtools API %c ${globalName}`, BADGE_API, 'color:#aaa');
  console.log(
    `%cType %c${globalName}.help()%c for a full API reference`,
    'color:#aaa',
    'color:#c8f;font-weight:bold',
    'color:#aaa',
  );
  const apiBlock = buildKVBlock(
    [
      ['.state', 'Full state snapshot (app, features, debug)'],
      ['.buildInfo', 'Build metadata (version, commit, branch)'],
      ['.perf.vitals()', 'Current Web Vitals (LCP, FCP, CLS, INP, …)'],
      ['.perf.beacon()', 'Beacon queue status (queued, sessionId, lastSent)'],
      ['.perf.device()', 'Device & connection info (memory, CPU, network)'],
      ['.set(path, value)', 'Generic setter — e.g. .set("app.theme", "midnight")'],
      ['.enable() / .disable()', 'Toggle debug mode on/off'],
      ['.logState()', 'Pretty-print full state to console'],
      ['.resetAllToDefaults()', 'Reset all state to defaults'],
      ['.copyDebugUrl()', 'Copy shareable debug URL to clipboard'],
      ['.login() / .logout()', 'Simulate auth state via URL params'],
      ['.help()', 'Print full API reference'],
    ],
    22,
  );
  console.log(...apiBlock);
  console.log(
    `  %cURL params%c ?${URL_PARAM_PREFIX}debug=true&${URL_PARAM_PREFIX}theme=midnight&${URL_PARAM_PREFIX}logLevel=debug&${URL_PARAM_PREFIX}ff.settings=false`,
    styles.keyLabel,
    styles.valueText,
  );
  console.groupEnd();

  // ── State Logger Hint ──────────────────────────────────────────
  if (logLevel !== 'trace' && logLevel !== 'debug') {
    console.log(
      `%c[${APP_NAME}] %c[Tip] %cState change logging requires logLevel "debug" or "trace". Currently: "%s". Set via: %s.setLogLevel("debug")`,
      'color:#8cf;font-weight:bold',
      'color:#fa0;font-weight:bold',
      'color:#aaa',
      logLevel,
      globalName,
    );
  } else {
    console.log(
      `%c[${APP_NAME}] %c[Logger] %cState change logging active — store mutations will be logged below`,
      'color:#8cf;font-weight:bold',
      'color:#4f4;font-weight:bold',
      'color:#aaa',
    );
  }

  /* eslint-enable no-console */
}

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Initializes all debug services reactively. Call once in `+layout.svelte`
 * inside a `$effect` block to watch `debug.enabled` for transitions.
 *
 * When called, checks `debugStore.debug.enabled`:
 * - If enabled and no handle exists: activates services
 * - If disabled and handle exists: destroys services
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @param handle - Current active handle (or null if not active)
 * @returns Updated handle (or null if deactivated)
 *
 * @example
 * ```svelte
 * <script>
 * let debugHandle: DebugServicesHandle | null = null;
 * $effect(() => {
 *   debugHandle = syncDebugServices(store, debugStore, debugHandle);
 * });
 * </script>
 * ```
 */
export function syncDebugServices(
  editorStore: EditorStore,
  debugStore: DebugStore,
  handle: DebugServicesHandle | null,
): DebugServicesHandle | null {
  const { enabled } = debugStore.debug;

  if (enabled && !handle) {
    return activateDebugServices(editorStore, debugStore);
  }
  if (!enabled && handle) {
    handle.destroy();
    return null;
  }
  return handle;
}
