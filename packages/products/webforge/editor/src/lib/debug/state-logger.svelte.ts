/**
 * State Change Logger
 *
 * Watches reactive state via `$effect` and logs changes to the browser
 * console with styled badges, old/new diffs, and timestamps.
 * Only active when debug mode is enabled and log level permits.
 *
 * Provides `createWatcher()` — a reusable utility that any component can
 * use to register its own reactive state for change tracking. The built-in
 * watchers (app, features, debug) use the same utility internally.
 *
 * @module
 */

import { styles, formatTimestamp, diffSnapshot } from '$lib/debug/console-styles';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';
import type { LogLevel } from '$lib/schemas/debug-state';

// =============================================================================
// Types
// =============================================================================

/** Cleanup function returned by `createWatcher` — call to stop watching. */
export type WatcherCleanup = () => void;

// =============================================================================
// Log Level Priority
// =============================================================================

/**
 * Numeric priority for each log level. Lower = more verbose.
 * State change logs are emitted at `debug` level.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
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
 * @param messageLevel - The level of the message to potentially log
 * @param currentLevel - The current log level threshold
 * @returns True if the message should be logged
 *
 * @example
 * ```typescript
 * shouldLog('debug', 'trace'); // true — trace allows everything
 * shouldLog('debug', 'info');  // false — info blocks debug messages
 * ```
 */
export function shouldLog(messageLevel: LogLevel, currentLevel: LogLevel): boolean {
	return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[currentLevel];
}

// =============================================================================
// State Change Logging
// =============================================================================

/**
 * Logs a single state change to the console with styled formatting.
 *
 * Format:
 * ```
 * ▸ EditorStore  app.theme  "warm" → "midnight"  12:34:56.789
 *     old: "warm"
 *     new: "midnight"
 * ```
 *
 * @param section - State section name (e.g., 'app', 'features')
 * @param key - Property key that changed
 * @param oldVal - Previous value
 * @param newVal - New value
 */
function logChange(section: string, key: string, oldVal: unknown, newVal: unknown): void {
	const ts: string = formatTimestamp();
	const oldStr: string = JSON.stringify(oldVal);
	const newStr: string = JSON.stringify(newVal);

	// eslint-disable-next-line no-console -- Intentional debug console output
	console.groupCollapsed(
		`%c EditorStore %c ${section}.${key} %c ${oldStr} → ${newStr} %c ${ts}`,
		styles.storeBadge,
		styles.propPath,
		styles.reset,
		styles.timestamp,
	);
	// eslint-disable-next-line no-console -- Intentional debug console output
	console.log('%cold:%c %o', styles.oldValue, styles.reset, oldVal);
	// eslint-disable-next-line no-console -- Intentional debug console output
	console.log('%cnew:%c %o', styles.newValue, styles.reset, newVal);
	// eslint-disable-next-line no-console -- Intentional debug console output
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
 * Any component with access to reactive state can use this to opt-in to
 * state change tracking. For example, the sidebar can register a watcher
 * for its `open`/`openMobile` state via the devtools API.
 *
 * @param name - Section name shown in console output (e.g., 'app', 'sidebar')
 * @param getter - Function that returns a plain snapshot of the reactive state
 * @param debugStore - The debug store (for log level gating)
 * @returns Cleanup function — call to stop watching
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
	name: string,
	getter: () => Record<string, unknown>,
	debugStore: DebugStore,
): WatcherCleanup {
	let prev: Record<string, unknown> = { ...getter() };

	return $effect.root(() => {
		$effect(() => {
			const current: Record<string, unknown> = { ...getter() };

			if (!shouldLog('debug', debugStore.debug.logLevel)) return;

			const diffs = diffSnapshot(prev, current);
			for (const diff of diffs) {
				logChange(name, diff.key, diff.old, diff.new);
			}
			prev = current;
		});
	});
}

// =============================================================================
// State Logger (built-in watchers)
// =============================================================================

/**
 * Creates a state change logger that watches all built-in store properties.
 *
 * Watches `editorStore.app`, `editorStore.features`, and `debugStore.debug`
 * using `createWatcher()`. On each change, diffs the current snapshot against
 * the previous one and logs changed keys to the console.
 *
 * Only logs when `debugStore.debug.logLevel` is 'debug' or 'trace'.
 *
 * @param editorStore - The editor state store to watch
 * @param debugStore - The debug store (watched for its own state + log level)
 * @returns Object with `destroy()` method to stop all watchers
 *
 * @example
 * ```typescript
 * const logger = createStateLogger(editorStore, debugStore);
 * // ... later
 * logger.destroy();
 * ```
 */
export function createStateLogger(
	editorStore: EditorStore,
	debugStore: DebugStore,
): { destroy(): void } {
	const cleanups: WatcherCleanup[] = [
		createWatcher('app', () => ({ ...editorStore.app }), debugStore),
		createWatcher('features', () => ({ ...editorStore.features }), debugStore),
		createWatcher('debug', () => ({ ...debugStore.debug }), debugStore),
	];

	return {
		destroy(): void {
			for (const cleanup of cleanups) {
				cleanup();
			}
		},
	};
}
