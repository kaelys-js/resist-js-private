/**
 * State Change Logger
 *
 * Watches reactive state via `$effect` and logs changes to the browser
 * console with styled badges, old/new diffs, and timestamps.
 * Only active when debug mode is enabled and log level permits.
 *
 * Provides `createWatcher()` — a reusable utility that any component can
 * use to register its own reactive state for change tracking. The built-in
 * watchers use the same utility internally.
 *
 * @module
 */

import { styles, formatTimestamp, diffSnapshot } from './console-styles';
import type { Bool, Num, Str, Void } from '@/schemas/common';
import type { LogLevel } from './types';

// =============================================================================
// Types
// =============================================================================

/** Cleanup function returned by `createWatcher` — call to stop watching. */
export type WatcherCleanup = () => Void;

/** Minimal debug store shape needed by the state logger. */
type DebugStoreLike = {
  readonly debug: { readonly logLevel: LogLevel };
};

// =============================================================================
// Log Level Priority
// =============================================================================

/**
 * Numeric priority for each log level. Lower = more verbose.
 * State change logs are emitted at `debug` level.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, Num> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

/**
 * Checks whether a message at `messageLevel` should be logged
 * given the current `currentLevel` setting.
 *
 * @param {LogLevel} messageLevel - The level of the message to potentially log
 * @param {LogLevel} currentLevel - The current log level threshold
 * @returns {Bool} True if the message should be logged
 *
 * @example
 * ```typescript
 * shouldLog('debug', 'trace'); // true — trace allows everything
 * shouldLog('debug', 'info');  // false — info blocks debug messages
 * ```
 */
export function shouldLog(messageLevel: LogLevel, currentLevel: LogLevel): Bool {
  return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
}

// =============================================================================
// State Change Logging
// =============================================================================

/**
 * Logs a single state change to the console with styled formatting.
 *
 * @param storeName - Store display name (e.g., 'EditorStore')
 * @param section - State section name (e.g., 'app', 'features')
 * @param key - Property key that changed
 * @param oldVal - Previous value
 * @param newVal - New value
 */
function logChange(storeName: Str, section: Str, key: Str, oldVal: unknown, newVal: unknown): Void {
  const ts: Str = formatTimestamp();
  const oldStr: Str = JSON.stringify(oldVal);
  const newStr: Str = JSON.stringify(newVal);

  console.groupCollapsed(
    `%c ${storeName} %c ${section}.${key} %c ${oldStr} → ${newStr} %c ${ts}`,
    styles.storeBadge,
    styles.propPath,
    styles.reset,
    styles.timestamp,
  );
  console.log('%cold:%c %o', styles.oldValue, styles.reset, oldVal);
  console.log('%cnew:%c %o', styles.newValue, styles.reset, newVal);
  console.groupEnd();
}

// =============================================================================
// Watcher Factory
// =============================================================================

/**
 * Creates a reactive watcher that logs state changes for a named section.
 *
 * Uses `$effect.root` for lifecycle independence — the watcher runs outside
 * the parent `$effect` tree and must be manually cleaned up by calling the
 * returned function.
 *
 * @param {Str} name - Section name shown in console output (e.g., 'app', 'sidebar')
 * @param {() => Record<Str, unknown>} getter - Function that returns a plain snapshot of the reactive state
 * @param {DebugStoreLike} debugStore - The debug store (for log level gating)
 * @param {Str} storeName - Display name for the store (defaults to 'Store')
 * @returns {WatcherCleanup} Cleanup function — call to stop watching
 *
 * @example
 * ```typescript
 * const cleanup = createWatcher(
 *   'sidebar',
 *   () => ({ open: sidebar.open, openMobile: sidebar.openMobile }),
 *   debugStore,
 * );
 * // ... later
 * cleanup(); // stops watching
 * ```
 */
export function createWatcher(
  name: Str,
  getter: () => Record<Str, unknown>,
  debugStore: DebugStoreLike,
  storeName: Str = 'Store',
): WatcherCleanup {
  let prev: Record<Str, unknown> = { ...getter() };

  // Svelte framework return — $effect.root() returns () => void, wrap to match () => Void
  const dispose: () => void = $effect.root(() => {
    $effect(() => {
      const current: Record<Str, unknown> = { ...getter() };

      if (!shouldLog('debug', debugStore.debug.logLevel)) {
        return;
      }

      const diffs = diffSnapshot(prev, current);

      for (const diff of diffs) {
        logChange(storeName, name, diff.key, diff.old, diff.new);
      }
      prev = current;
    });
  });

  return (): Void => {
    dispose();
  };
}

// =============================================================================
// State Logger (built-in watchers for standard sections)
// =============================================================================

/**
 * Creates a state change logger that watches named sections of stores.
 *
 * By default watches `app`, `features`, and `debug` sections.
 * Products can pass custom section names and getters.
 *
 * @param {Array<{ name: Str; getter: () => Record<Str, unknown> }>} sections - Array of `{ name, getter }` pairs to watch
 * @param {DebugStoreLike} debugStore - The debug store (for log level gating)
 * @param {Str} storeName - Display name for the store (defaults to 'Store')
 * @returns {{ destroy(): Void }} Object with `destroy()` method to stop all watchers
 *
 * @example
 * ```typescript
 * const logger = createStateLogger(
 *   [
 *     { name: 'app', getter: () => ({ ...editorStore.app }) },
 *     { name: 'features', getter: () => ({ ...editorStore.features }) },
 *     { name: 'debug', getter: () => ({ ...debugStore.debug }) },
 *   ],
 *   debugStore,
 *   'EditorStore',
 * );
 * // ... later
 * logger.destroy();
 * ```
 */
export function createStateLogger(
  sections: Array<{ name: Str; getter: () => Record<Str, unknown> }>,
  debugStore: DebugStoreLike,
  storeName: Str = 'Store',
): { destroy(): Void } {
  const cleanups: WatcherCleanup[] = sections.map((s) =>
    createWatcher(s.name, s.getter, debugStore, storeName),
  );

  return {
    destroy(): Void {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
