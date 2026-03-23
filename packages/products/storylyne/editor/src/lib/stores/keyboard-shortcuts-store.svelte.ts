/**
 * Reactive keyboard shortcuts store with localStorage persistence.
 *
 * Wraps the central keyboard shortcut registry in Svelte 5 `$state` runes,
 * provides reactive getters for UI binding, and auto-persists customizations.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { shortcutStore } from '$lib/stores/keyboard-shortcuts-store.svelte';
 *
 * // Reactive access in Svelte components:
 * const hint = $derived(shortcutStore.format('DEV_FLAGS_PANEL'));
 *
 * // Match in a keydown handler:
 * if (shortcutStore.matches(e, 'TOGGLE_SIDEBAR')) { sidebar.toggle(); }
 * ```
 */

import type { Void, Str, Bool } from '@/schemas/common';
import { type Result, okUnchecked, err, ERRORS } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import {
  matchesShortcut,
  formatShortcut,
  detectConflicts,
  getAllShortcuts,
  updateShortcut,
  resetShortcut,
  resetAllShortcuts,
  ShortcutRegistrySchema,
  type ShortcutRegistry,
  type ShortcutId,
  type KeyboardShortcut,
  type ShortcutConflict,
  type ModifierKey,
} from '$lib/config/keyboard-shortcuts';
import { storageKey } from '$lib/config/app-meta';

// ── Constants ───────────────────────────────────────────────────────────────

/** localStorage key for persisting shortcut customizations. */
export const SHORTCUTS_STORAGE_KEY: Str = storageKey('keyboard-shortcuts');

// ── Module-level reactive state ─────────────────────────────────────────────

let _registry: ShortcutRegistry = $state(resetAllShortcuts());

// ── Persistence helpers ─────────────────────────────────────────────────────

/**
 * Serializes the current shortcut registry to localStorage.
 *
 * @returns `Result<Void>` — ok on success, error if write fails
 */
function save(): Result<Void> {
  if (typeof window === 'undefined') return okUnchecked<Void>(undefined);
  try {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(_registry));
    return okUnchecked<Void>(undefined);
  } catch {
    return err(ERRORS.IO.WRITE_FAILED, 'Failed to save keyboard shortcuts to localStorage');
  }
}

/**
 * Loads shortcut customizations from localStorage and merges with defaults.
 *
 * Unknown keys are ignored; missing keys get default values.
 * Falls back to full defaults on any parse error.
 *
 * @returns `Result<Void>` — ok on success or when no saved state exists
 */
function load(): Result<Void> {
  if (typeof window === 'undefined') return okUnchecked<Void>(undefined);
  try {
    const raw: Str | null = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return okUnchecked<Void>(undefined);

    const parsed: unknown = JSON.parse(raw);
    // v.record(picklist, schema) infers partial — keys are optional in Valibot record output
    const result: Result<Partial<ShortcutRegistry>> = safeParse(ShortcutRegistrySchema, parsed);
    if (!result.ok) {
      // Saved data is invalid or stale — reset to defaults
      _registry = resetAllShortcuts();
      return okUnchecked<Void>(undefined);
    }

    // Merge validated saved customizations over defaults
    const defaults: ShortcutRegistry = resetAllShortcuts();
    const saved: Partial<ShortcutRegistry> = result.data;

    // as ShortcutId[] — Object.keys returns string[], but defaults keys are ShortcutId by construction
    for (const id of Object.keys(defaults) as ShortcutId[]) {
      const savedEntry: KeyboardShortcut | undefined = saved[id];
      if (savedEntry) {
        // Only merge key, modifiers, and enabled — everything else comes from defaults
        defaults[id] = {
          ...defaults[id],
          key: savedEntry.key,
          modifiers: [...savedEntry.modifiers],
          enabled: savedEntry.enabled,
        };
      }
    }

    _registry = defaults;
    return okUnchecked<Void>(undefined);
  } catch {
    _registry = resetAllShortcuts();
    return okUnchecked<Void>(undefined);
  }
}

// ── Store type ──────────────────────────────────────────────────────────────

/**
 * The keyboard shortcuts store interface.
 *
 * Provides reactive access to the shortcut registry, platform-aware formatting,
 * event matching, customization, conflict detection, and persistence.
 */
export type KeyboardShortcutsStore = {
  /** The full reactive shortcut registry. */
  readonly registry: ShortcutRegistry;
  /** Get a specific shortcut by ID. */
  get(id: ShortcutId): KeyboardShortcut;
  /** Check if a keyboard event matches a shortcut. */
  matches(e: KeyboardEvent, id: ShortcutId): Bool;
  /** Format a shortcut for display (platform-aware). */
  format(id: ShortcutId): Str;
  /** Get all shortcuts as a sorted array. */
  all(): KeyboardShortcut[];
  /** Detect any shortcut conflicts. */
  conflicts(): ShortcutConflict[];
  /** Update a shortcut's key binding. */
  update(id: ShortcutId, key: Str, modifiers: readonly ModifierKey[]): Result<Void>;
  /** Reset a single shortcut to its default. */
  reset(id: ShortcutId): Result<Void>;
  /** Reset all shortcuts to defaults. */
  resetAll(): Result<Void>;
  /** Persist current state to localStorage. */
  save(): Result<Void>;
  /** Load state from localStorage. */
  load(): Result<Void>;
};

// ── Store instance ──────────────────────────────────────────────────────────

/**
 * Singleton keyboard shortcuts store.
 *
 * Provides reactive shortcut state, platform-aware formatting,
 * event matching, and localStorage persistence.
 *
 * @example
 * ```typescript
 * // In a Svelte component:
 * const kbdHint = $derived(shortcutStore.format('TOGGLE_SIDEBAR'));
 *
 * // In a keydown handler:
 * function onKeydown(e: KeyboardEvent) {
 *   if (shortcutStore.matches(e, 'TOGGLE_SIDEBAR')) {
 *     e.preventDefault();
 *     sidebar.toggle();
 *   }
 * }
 * ```
 */
export const shortcutStore: KeyboardShortcutsStore = {
  get registry(): ShortcutRegistry {
    return _registry;
  },

  get(id: ShortcutId): KeyboardShortcut {
    return _registry[id];
  },

  matches(e: KeyboardEvent, id: ShortcutId): Bool {
    return matchesShortcut(e, _registry[id]);
  },

  format(id: ShortcutId): Str {
    return formatShortcut(_registry[id]);
  },

  all(): KeyboardShortcut[] {
    return getAllShortcuts(_registry);
  },

  conflicts(): ShortcutConflict[] {
    return detectConflicts(_registry);
  },

  update(id, key, modifiers): Result<Void> {
    // JSON round-trip to strip $state proxies — structuredClone can't clone Svelte proxies
    const plain: ShortcutRegistry = JSON.parse(JSON.stringify(_registry)) as ShortcutRegistry;
    const result: Result<ShortcutRegistry> = updateShortcut(plain, id, key, modifiers);
    if (!result.ok) return result;
    _registry = result.data;
    save();
    return okUnchecked<Void>(undefined);
  },

  reset(id): Result<Void> {
    // JSON round-trip to strip $state proxies — structuredClone can't clone Svelte proxies
    const plain: ShortcutRegistry = JSON.parse(JSON.stringify(_registry)) as ShortcutRegistry;
    const result: Result<ShortcutRegistry> = resetShortcut(plain, id);
    if (!result.ok) return result;
    _registry = result.data;
    save();
    return okUnchecked<Void>(undefined);
  },

  resetAll(): Result<Void> {
    _registry = resetAllShortcuts();
    save();
    return okUnchecked<Void>(undefined);
  },

  save,
  load,
};
