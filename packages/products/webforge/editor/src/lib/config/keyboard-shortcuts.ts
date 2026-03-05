/**
 * Central keyboard shortcut registry.
 *
 * Single source of truth for every keyboard shortcut in the editor.
 * Provides platform-aware matching, display formatting, conflict detection,
 * and an editable-target guard so shortcuts never fire inside inputs.
 *
 * @module
 *
 * @example
 * ```typescript
 * import {
 *   DEFAULT_SHORTCUTS,
 *   matchesShortcut,
 *   formatShortcut,
 *   isEditableTarget,
 *   detectConflicts,
 * } from '$lib/config/keyboard-shortcuts';
 *
 * // In a keydown handler:
 * if (matchesShortcut(e, shortcuts.TOGGLE_SIDEBAR)) { sidebar.toggle(); }
 *
 * // In a tooltip:
 * <kbd>{formatShortcut(shortcuts.DEV_FLAGS_PANEL)}</kbd>
 * ```
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import { type Result, okUnchecked, err, ERRORS } from '@/schemas/result/result';
import type { Str, Bool } from '@/schemas/common';

// ── Platform detection ───────────────────────────────────────────────────────

/** Whether the current platform is macOS / iOS. */
export const IS_MAC: Bool =
	typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

// ── Schemas ──────────────────────────────────────────────────────────────────

/**
 * Supported modifier keys.
 *
 * `'cmdOrCtrl'` is a virtual modifier that matches either `Ctrl` or `Meta` (Cmd),
 * making shortcuts work correctly across platforms regardless of user-agent detection.
 * Use it for standard shortcuts like `Cmd/Ctrl+B` that should work on any platform.
 */
export const ModifierKeySchema = v.picklist(['ctrl', 'shift', 'alt', 'meta', 'cmdOrCtrl']);

/** Inferred modifier key type. */
export type ModifierKey = v.InferOutput<typeof ModifierKeySchema>;

/**
 * Context in which a shortcut is active.
 *
 * - `global` — always active (any page state)
 * - `devToolbar` — only when the dev toolbar is open
 * - `editor` — only when the map/scene editor is focused
 * - `sidebar` — only when the sidebar is visible
 */
export const ShortcutContextSchema = v.picklist(['global', 'devToolbar', 'editor', 'sidebar']);

/** Inferred shortcut context type. */
export type ShortcutContext = v.InferOutput<typeof ShortcutContextSchema>;

/** Schema for a single keyboard shortcut definition. */
export const KeyboardShortcutSchema = v.strictObject({
	/** Unique identifier (e.g., `'TOGGLE_SIDEBAR'`). */
	id: v.string(),
	/** The key to press (e.g., `'b'`, `'1'`, `'Escape'`, `'D'`). Case-sensitive. */
	key: v.string(),
	/** Required modifier keys (order-independent). */
	modifiers: v.pipe(v.array(ModifierKeySchema), v.readonly()),
	/** Short human-readable label for the action. */
	label: v.string(),
	/** Longer description for accessibility / help dialogs. */
	description: v.string(),
	/** Context in which this shortcut is active. */
	context: ShortcutContextSchema,
	/** Whether the shortcut is currently enabled. */
	enabled: v.boolean(),
	/** Original default key (for reset). */
	defaultKey: v.string(),
	/** Original default modifiers (for reset). */
	defaultModifiers: v.pipe(v.array(ModifierKeySchema), v.readonly()),
});

/** Inferred keyboard shortcut type. */
export type KeyboardShortcut = v.InferOutput<typeof KeyboardShortcutSchema>;

// ── Shortcut IDs ─────────────────────────────────────────────────────────────

/** All valid shortcut identifiers. */
export const SHORTCUT_IDS = [
	'TOGGLE_DEV_TOOLBAR',
	'CLOSE_PANEL',
	'TOGGLE_SIDEBAR',
	'DEV_FLAGS_PANEL',
	'DEV_APP_PANEL',
	'DEV_DEBUG_PANEL',
	'DEV_CYCLE_MODE',
	'DEV_COPY_STATE',
	'DEV_RESET_ALL',
] as const;

/** Union type of all shortcut IDs. */
export type ShortcutId = (typeof SHORTCUT_IDS)[number];

/** Schema for the shortcut ID union. */
export const ShortcutIdSchema = v.picklist(SHORTCUT_IDS);

/** Schema for the full shortcut registry (map of ID → shortcut). */
export const ShortcutRegistrySchema = v.record(ShortcutIdSchema, KeyboardShortcutSchema);

/** Inferred registry type. */
export type ShortcutRegistry = Record<ShortcutId, KeyboardShortcut>;

// ── Default shortcuts ────────────────────────────────────────────────────────

/**
 * Creates a shortcut entry with defaults pre-filled.
 *
 * @param id - Unique shortcut identifier
 * @param key - The key to press
 * @param modifiers - Required modifier keys
 * @param label - Short action label
 * @param description - Longer description
 * @param context - Active context
 * @returns A fully-formed KeyboardShortcut
 */
function def(
	id: Str,
	key: Str,
	modifiers: readonly ModifierKey[],
	label: Str,
	description: Str,
	context: ShortcutContext,
): KeyboardShortcut {
	return {
		id,
		key,
		modifiers: [...modifiers],
		label,
		description,
		context,
		enabled: true,
		defaultKey: key,
		defaultModifiers: [...modifiers],
	};
}

/** Default shortcut definitions — the canonical registry. */
export const DEFAULT_SHORTCUTS: ShortcutRegistry = {
	TOGGLE_DEV_TOOLBAR: def(
		'TOGGLE_DEV_TOOLBAR',
		'D',
		['ctrl', 'shift'],
		'Toggle Developer Toolbar',
		'Show or hide the developer toolbar and enable debug mode',
		'global',
	),
	CLOSE_PANEL: def(
		'CLOSE_PANEL',
		'Escape',
		[],
		'Close Panel',
		'Close the active panel or toolbar',
		'global',
	),
	TOGGLE_SIDEBAR: def(
		'TOGGLE_SIDEBAR',
		'b',
		['cmdOrCtrl'],
		'Toggle Sidebar',
		'Show or hide the project sidebar',
		'global',
	),
	DEV_FLAGS_PANEL: def(
		'DEV_FLAGS_PANEL',
		'1',
		['ctrl'],
		'Feature Flags',
		'Toggle the feature flags panel',
		'devToolbar',
	),
	DEV_APP_PANEL: def(
		'DEV_APP_PANEL',
		'2',
		['ctrl'],
		'App Preferences',
		'Toggle the app preferences panel',
		'devToolbar',
	),
	DEV_DEBUG_PANEL: def(
		'DEV_DEBUG_PANEL',
		'3',
		['ctrl'],
		'Debug Settings',
		'Toggle the debug settings panel',
		'devToolbar',
	),
	DEV_CYCLE_MODE: def(
		'DEV_CYCLE_MODE',
		'4',
		['ctrl'],
		'Cycle Theme Mode',
		'Cycle between light, dark, and system theme modes',
		'devToolbar',
	),
	DEV_COPY_STATE: def(
		'DEV_COPY_STATE',
		'5',
		['ctrl'],
		'Copy State JSON',
		'Copy the current editor state as JSON to clipboard',
		'devToolbar',
	),
	DEV_RESET_ALL: def(
		'DEV_RESET_ALL',
		'6',
		['ctrl'],
		'Reset All Defaults',
		'Reset all preferences, flags, and debug settings to defaults',
		'devToolbar',
	),
};

// ── Core functions ───────────────────────────────────────────────────────────

/**
 * Checks whether the event target is an editable element (input, textarea, contenteditable).
 *
 * @param e - The keyboard event to check
 * @returns True if the target is an editable element that should consume keystrokes
 *
 * @example
 * ```typescript
 * if (isEditableTarget(e)) return; // Don't intercept typing
 * ```
 */
export function isEditableTarget(e: KeyboardEvent): Bool {
	const { target } = e;
	if (!(target instanceof HTMLElement)) return false;
	const tag: Str = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
	if (target.isContentEditable || target.contentEditable === 'true') return true;
	return false;
}

/**
 * Tests whether a KeyboardEvent matches a shortcut definition.
 *
 * Handles platform-aware modifier mapping:
 * - `'meta'` checks `e.metaKey` (Cmd on Mac)
 * - `'ctrl'` checks `e.ctrlKey`
 * - `'shift'` checks `e.shiftKey`
 * - `'alt'` checks `e.altKey`
 *
 * Also ensures NO extra modifiers are pressed beyond what the shortcut requires.
 * Automatically returns false if the target is an editable element (unless the
 * shortcut uses Escape which should always work).
 *
 * @param e - The keyboard event
 * @param shortcut - The shortcut definition to match against
 * @returns True if the event matches the shortcut
 *
 * @example
 * ```typescript
 * if (matchesShortcut(e, shortcuts.TOGGLE_SIDEBAR)) {
 *   e.preventDefault();
 *   sidebar.toggle();
 * }
 * ```
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): Bool {
	if (!shortcut.enabled) return false;

	// Escape always works, even in inputs
	if (shortcut.key !== 'Escape' && isEditableTarget(e)) return false;

	// Key match (case-sensitive for letters, case-insensitive for special keys)
	if (e.key !== shortcut.key) return false;

	// Check required modifiers are ALL pressed
	const mods: readonly ModifierKey[] = shortcut.modifiers;
	const hasCmdOrCtrl: Bool = mods.includes('cmdOrCtrl');
	const wantCtrl: Bool = mods.includes('ctrl');
	const wantMeta: Bool = mods.includes('meta');
	const wantShift: Bool = mods.includes('shift');
	const wantAlt: Bool = mods.includes('alt');

	if (hasCmdOrCtrl) {
		// cmdOrCtrl: exactly one of Ctrl/Meta must be pressed (not both, not neither)
		if (e.ctrlKey === e.metaKey) return false;
	} else {
		if (wantCtrl !== e.ctrlKey) return false;
		if (wantMeta !== e.metaKey) return false;
	}

	if (wantShift !== e.shiftKey) return false;
	if (wantAlt !== e.altKey) return false;

	return true;
}

// ── Display formatting ───────────────────────────────────────────────────────

/** Mac modifier symbols. */
const MAC_SYMBOLS: Readonly<Record<ModifierKey, Str>> = {
	ctrl: '⌃',
	meta: '⌘',
	shift: '⇧',
	alt: '⌥',
	cmdOrCtrl: '⌘',
};

/** Non-Mac modifier labels. */
const PC_LABELS: Readonly<Record<ModifierKey, Str>> = {
	ctrl: 'Ctrl',
	meta: 'Win',
	shift: 'Shift',
	alt: 'Alt',
	cmdOrCtrl: 'Ctrl',
};

/** Display order for modifiers (consistent across platform). */
const MODIFIER_ORDER: readonly ModifierKey[] = ['ctrl', 'cmdOrCtrl', 'meta', 'shift', 'alt'];

/**
 * Formats a shortcut for display in tooltips and UI.
 *
 * Returns platform-appropriate symbols:
 * - Mac: `⌃1`, `⌘B`, `⌃⇧D`
 * - Windows/Linux: `Ctrl+1`, `Ctrl+B`, `Ctrl+Shift+D`
 *
 * @param shortcut - The shortcut to format
 * @returns Platform-aware display string
 *
 * @example
 * ```typescript
 * formatShortcut(shortcuts.TOGGLE_SIDEBAR); // "⌘B" on Mac, "Ctrl+B" on Win
 * formatShortcut(shortcuts.DEV_FLAGS_PANEL); // "⌃1" on Mac, "Ctrl+1" on Win
 * ```
 */
export function formatShortcut(shortcut: KeyboardShortcut): Str {
	const mods: ModifierKey[] = MODIFIER_ORDER.filter((m) => shortcut.modifiers.includes(m));

	// Special key display names
	let keyDisplay: Str = shortcut.key;
	if (shortcut.key === 'Escape') keyDisplay = 'Esc';
	else if (shortcut.key === ' ') keyDisplay = 'Space';

	if (IS_MAC) {
		const modStr: Str = mods.map((m) => MAC_SYMBOLS[m]).join('');
		return `${modStr}${keyDisplay}`;
	}

	const parts: Str[] = mods.map((m) => PC_LABELS[m]);
	parts.push(keyDisplay);
	return parts.join('+');
}

// ── Conflict detection ───────────────────────────────────────────────────────

/** A detected shortcut conflict between two entries. */
export const ShortcutConflictSchema = v.strictObject({
	a: v.string(),
	b: v.string(),
	key: v.string(),
	modifiers: v.pipe(v.array(ModifierKeySchema), v.readonly()),
	context: ShortcutContextSchema,
});

/** Inferred conflict type. */
export type ShortcutConflict = v.InferOutput<typeof ShortcutConflictSchema>;

/**
 * Scans a shortcut registry for conflicting key bindings.
 *
 * Two shortcuts conflict if they share the same key + modifiers AND
 * are in the same context (or either is `'global'`).
 *
 * @param registry - The shortcut registry to scan
 * @returns Array of detected conflicts (empty if none)
 *
 * @example
 * ```typescript
 * const conflicts = detectConflicts(shortcuts);
 * if (conflicts.length > 0) {
 *   console.warn('Shortcut conflicts:', conflicts);
 * }
 * ```
 */
export function detectConflicts(registry: ShortcutRegistry): ShortcutConflict[] {
	const conflicts: ShortcutConflict[] = [];
	const entries: KeyboardShortcut[] = Object.values(registry).filter((s) => s.enabled);

	for (let i = 0; i < entries.length; i++) {
		for (let j: number = i + 1; j < entries.length; j++) {
			const a: KeyboardShortcut = entries[i];
			const b: KeyboardShortcut = entries[j];

			// Same key?
			if (a.key !== b.key) continue;

			// Same modifiers (order-independent)?
			const aMods: Str = [...a.modifiers].toSorted().join(',');
			const bMods: Str = [...b.modifiers].toSorted().join(',');
			if (aMods !== bMods) continue;

			// Context overlap? (global overlaps everything, same context overlaps)
			const overlaps: Bool =
				a.context === 'global' || b.context === 'global' || a.context === b.context;
			if (!overlaps) continue;

			conflicts.push({
				a: a.id,
				b: b.id,
				key: a.key,
				modifiers: [...a.modifiers],
				context: a.context === 'global' ? b.context : a.context,
			});
		}
	}

	return conflicts;
}

/**
 * Returns all shortcuts as a flat array, sorted by context then label.
 *
 * Useful for rendering a keyboard shortcuts help dialog.
 *
 * @param registry - The shortcut registry
 * @returns Sorted array of all shortcuts
 *
 * @example
 * ```typescript
 * const all = getAllShortcuts(shortcuts);
 * for (const s of all) {
 *   console.log(`${s.label}: ${formatShortcut(s)}`);
 * }
 * ```
 */
export function getAllShortcuts(registry: ShortcutRegistry): KeyboardShortcut[] {
	return Object.values(registry).toSorted((a, b) => {
		const contextCmp: number = a.context.localeCompare(b.context);
		if (contextCmp !== 0) return contextCmp;
		return a.label.localeCompare(b.label);
	});
}

// ── Shortcut update validation ───────────────────────────────────────────────

/**
 * Validates and applies a shortcut update, checking for conflicts.
 *
 * Returns a new registry with the updated shortcut, or an error if:
 * - The shortcut ID is unknown
 * - The new binding would create a conflict
 *
 * @param registry - Current shortcut registry
 * @param id - ID of the shortcut to update
 * @param key - New key binding
 * @param modifiers - New modifier keys
 * @returns Result containing the updated registry or a validation error
 *
 * @example
 * ```typescript
 * const result = updateShortcut(registry, 'TOGGLE_SIDEBAR', 'k', ['meta']);
 * if (!result.ok) return result; // conflict or invalid ID
 * shortcuts = result.data;
 * ```
 */
export function updateShortcut(
	registry: ShortcutRegistry,
	id: Str,
	key: Str,
	modifiers: readonly ModifierKey[],
): Result<ShortcutRegistry> {
	const idResult = safeParse(ShortcutIdSchema, id);
	if (!idResult.ok) return err(ERRORS.VALIDATION.SCHEMA_FAILED, `Unknown shortcut ID: ${id}`);

	const validId: ShortcutId = idResult.data;
	const existing: KeyboardShortcut = registry[validId];

	// Build candidate registry with the update applied
	const updated: ShortcutRegistry = {
		...registry,
		[validId]: {
			...existing,
			key,
			modifiers: [...modifiers],
		},
	};

	// Check for conflicts
	const conflicts: ShortcutConflict[] = detectConflicts(updated);
	if (conflicts.length > 0) {
		const [conflict]: ShortcutConflict[] = conflicts;
		return err(
			ERRORS.VALIDATION.INVALID_FORMAT,
			`Shortcut conflict: "${conflict.a}" and "${conflict.b}" both use ${key} with [${modifiers.join(', ')}]`,
		);
	}

	return okUnchecked(updated);
}

/**
 * Resets a single shortcut to its default key and modifiers.
 *
 * @param registry - Current shortcut registry
 * @param id - ID of the shortcut to reset
 * @returns Result containing the updated registry
 *
 * @example
 * ```typescript
 * const result = resetShortcut(registry, 'TOGGLE_SIDEBAR');
 * if (!result.ok) return result;
 * shortcuts = result.data;
 * ```
 */
export function resetShortcut(registry: ShortcutRegistry, id: Str): Result<ShortcutRegistry> {
	const idResult = safeParse(ShortcutIdSchema, id);
	if (!idResult.ok) return err(ERRORS.VALIDATION.SCHEMA_FAILED, `Unknown shortcut ID: ${id}`);

	const validId: ShortcutId = idResult.data;
	const existing: KeyboardShortcut = registry[validId];

	return okUnchecked({
		...registry,
		[validId]: {
			...existing,
			key: existing.defaultKey,
			modifiers: [...existing.defaultModifiers],
		},
	});
}

/**
 * Resets all shortcuts to their default bindings.
 *
 * @returns A fresh copy of the default shortcut registry
 *
 * @example
 * ```typescript
 * shortcuts = resetAllShortcuts();
 * ```
 */
export function resetAllShortcuts(): ShortcutRegistry {
	return structuredClone(DEFAULT_SHORTCUTS) as ShortcutRegistry;
}
