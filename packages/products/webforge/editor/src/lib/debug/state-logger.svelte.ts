/**
 * State Change Logger
 *
 * Watches EditorStore reactive state via `$effect` and logs changes to the
 * browser console with styled badges, old/new diffs, and timestamps.
 * Only active when debug mode is enabled and log level permits.
 *
 * Auto-discovers state fields via schema introspection — adding new fields
 * to AppPreferencesSchema or FeatureFlagsSchema requires zero changes here.
 *
 * @module
 */

import { styles, formatTimestamp, diffSnapshot } from '$lib/debug/console-styles';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';
import type { LogLevel } from '$lib/schemas/debug-state';

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
// State Logger
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

/**
 * Creates a state change logger that watches all EditorStore properties.
 *
 * Uses `$effect` to reactively watch `editorStore.app` and `editorStore.features`.
 * On each change, diffs the current snapshot against the previous one and logs
 * changed keys to the console.
 *
 * Only logs when:
 * - `debugStore.debug.enabled` is true
 * - `debugStore.debug.logLevel` is 'debug' or 'trace'
 *
 * @param editorStore - The editor state store to watch
 * @param debugStore - The debug store for log level checking
 * @returns Object with `destroy()` method to stop watching
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
	let prevApp: Record<string, unknown> = { ...editorStore.app };
	let prevFeatures: Record<string, unknown> = { ...editorStore.features };
	let destroyed = false;

	$effect(() => {
		if (destroyed) return;

		// Read reactive state to establish dependency tracking
		const currentApp = { ...editorStore.app };

		// Skip logging if log level doesn't allow debug messages
		if (!shouldLog('debug', debugStore.debug.logLevel)) return;

		const appDiffs = diffSnapshot(prevApp, currentApp);
		for (const diff of appDiffs) {
			logChange('app', diff.key, diff.old, diff.new);
		}
		prevApp = currentApp;
	});

	$effect(() => {
		if (destroyed) return;

		// Read reactive state to establish dependency tracking
		const currentFeatures = { ...editorStore.features };

		// Skip logging if log level doesn't allow debug messages
		if (!shouldLog('debug', debugStore.debug.logLevel)) return;

		const featureDiffs = diffSnapshot(prevFeatures, currentFeatures);
		for (const diff of featureDiffs) {
			logChange('features', diff.key, diff.old, diff.new);
		}
		prevFeatures = currentFeatures;
	});

	return {
		destroy(): void {
			destroyed = true;
		},
	};
}
