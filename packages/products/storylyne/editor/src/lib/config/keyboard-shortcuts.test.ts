/**
 * Unit tests for the central keyboard shortcut registry.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_IDS,
  IS_MAC,
  isEditableTarget,
  matchesShortcut,
  formatShortcut,
  detectConflicts,
  getAllShortcuts,
  updateShortcut,
  resetShortcut,
  resetAllShortcuts,
  KeyboardShortcutSchema,
  ShortcutRegistrySchema,
  ShortcutIdSchema,
  type KeyboardShortcut,
  type ShortcutRegistry,
} from './keyboard-shortcuts';
import { safeParse } from '@/utils/result/safe';
import type { Bool, Str } from '@/schemas/common';

// ── Test helpers ────────────────────────────────────────────────────────────

/**
 * Creates a minimal KeyboardEvent-like object for testing.
 *
 * @param key - The key value
 * @param opts - Optional modifier and target overrides
 * @returns A KeyboardEvent-compatible object
 */
function mockEvent(
  key: Str,
  opts: {
    ctrlKey?: Bool;
    metaKey?: Bool;
    shiftKey?: Bool;
    altKey?: Bool;
    target?: EventTarget | null;
  } = {},
): KeyboardEvent {
  const target = opts.target ?? document.createElement('div');
  return {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    target,
    preventDefault: () => {},
  } as unknown as KeyboardEvent;
}

/**
 * Creates a shortcut definition for testing.
 *
 * @param overrides - Fields to override on the base shortcut
 * @returns A KeyboardShortcut with test defaults
 */
function testShortcut(overrides: Partial<KeyboardShortcut> = {}): KeyboardShortcut {
  return {
    id: 'TEST',
    key: 'x',
    modifiers: ['ctrl'],
    label: 'Test',
    description: 'Test shortcut',
    context: 'global',
    enabled: true,
    defaultKey: 'x',
    defaultModifiers: ['ctrl'],
    ...overrides,
  };
}

/**
 * Creates a fresh copy of DEFAULT_SHORTCUTS for isolated mutation tests.
 *
 * @returns A mutable copy of the default registry
 */
function freshRegistry(): ShortcutRegistry {
  return resetAllShortcuts();
}

// ── Schema validation ─────────────────────────────────────────────────────

describe('keyboard shortcut schemas', () => {
  it('validates a well-formed shortcut', () => {
    const shortcut: KeyboardShortcut = testShortcut();
    const result = safeParse(KeyboardShortcutSchema, shortcut);
    expect(result.ok).toBe(true);
  });

  it('rejects unknown modifier keys', () => {
    const bad = { ...testShortcut(), modifiers: ['super'] };
    const result = safeParse(KeyboardShortcutSchema, bad);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown context values', () => {
    const bad = { ...testShortcut(), context: 'custom' };
    const result = safeParse(KeyboardShortcutSchema, bad);
    expect(result.ok).toBe(false);
  });

  it('validates all SHORTCUT_IDS against ShortcutIdSchema', () => {
    for (const id of SHORTCUT_IDS) {
      const result = safeParse(ShortcutIdSchema, id);
      expect(result.ok).toBe(true);
    }
  });

  it('rejects unknown shortcut IDs', () => {
    const result = safeParse(ShortcutIdSchema, 'UNKNOWN_ID');
    expect(result.ok).toBe(false);
  });

  it('validates the full default registry against ShortcutRegistrySchema', () => {
    const result = safeParse(ShortcutRegistrySchema, DEFAULT_SHORTCUTS);
    expect(result.ok).toBe(true);
  });
});

// ── DEFAULT_SHORTCUTS ─────────────────────────────────────────────────────

describe('DEFAULT_SHORTCUTS', () => {
  it('contains an entry for every SHORTCUT_ID', () => {
    for (const id of SHORTCUT_IDS) {
      expect(DEFAULT_SHORTCUTS).toHaveProperty(id);
      expect(DEFAULT_SHORTCUTS[id].id).toBe(id);
    }
  });

  it('has 10 default shortcuts', () => {
    expect(Object.keys(DEFAULT_SHORTCUTS)).toHaveLength(10);
  });

  it('all shortcuts are enabled by default', () => {
    for (const shortcut of Object.values(DEFAULT_SHORTCUTS)) {
      expect(shortcut.enabled).toBe(true);
    }
  });

  it('stores defaults for reset (defaultKey/defaultModifiers match key/modifiers)', () => {
    for (const shortcut of Object.values(DEFAULT_SHORTCUTS)) {
      expect(shortcut.defaultKey).toBe(shortcut.key);
      expect(shortcut.defaultModifiers).toEqual(shortcut.modifiers);
    }
  });

  it('TOGGLE_DEV_TOOLBAR uses Ctrl+Shift+D', () => {
    const s = DEFAULT_SHORTCUTS.TOGGLE_DEV_TOOLBAR;
    expect(s.key).toBe('D');
    expect(s.modifiers).toContain('ctrl');
    expect(s.modifiers).toContain('shift');
    expect(s.context).toBe('global');
  });

  it('CLOSE_PANEL uses Escape with no modifiers', () => {
    const s = DEFAULT_SHORTCUTS.CLOSE_PANEL;
    expect(s.key).toBe('Escape');
    expect(s.modifiers).toHaveLength(0);
    expect(s.context).toBe('global');
  });

  it('TOGGLE_SIDEBAR uses cmdOrCtrl+b (platform-independent)', () => {
    const s = DEFAULT_SHORTCUTS.TOGGLE_SIDEBAR;
    expect(s.key).toBe('b');
    expect(s.modifiers).toContain('cmdOrCtrl');
    expect(s.context).toBe('global');
  });

  it('DEV panel shortcuts (1-7) use Ctrl modifier', () => {
    const panelIds: Array<keyof ShortcutRegistry> = [
      'DEV_FLAGS_PANEL',
      'DEV_APP_PANEL',
      'DEV_DEBUG_PANEL',
      'DEV_PERF_PANEL',
      'DEV_CYCLE_MODE',
      'DEV_COPY_STATE',
      'DEV_RESET_ALL',
    ];
    for (let i = 0; i < panelIds.length; i++) {
      const s = DEFAULT_SHORTCUTS[panelIds[i]];
      expect(s.key).toBe(String(i + 1));
      expect(s.modifiers).toEqual(['ctrl']);
      expect(s.context).toBe('devToolbar');
    }
  });
});

// ── isEditableTarget ──────────────────────────────────────────────────────

describe('isEditableTarget', () => {
  it('returns true for INPUT elements', () => {
    const input = document.createElement('input');
    const e = mockEvent('a', { target: input });
    expect(isEditableTarget(e)).toBe(true);
  });

  it('returns true for TEXTAREA elements', () => {
    const textarea = document.createElement('textarea');
    const e = mockEvent('a', { target: textarea });
    expect(isEditableTarget(e)).toBe(true);
  });

  it('returns true for contenteditable elements', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    const e = mockEvent('a', { target: div });
    expect(isEditableTarget(e)).toBe(true);
  });

  it('returns false for regular DIV elements', () => {
    const div = document.createElement('div');
    const e = mockEvent('a', { target: div });
    expect(isEditableTarget(e)).toBe(false);
  });

  it('returns false for BUTTON elements', () => {
    const button = document.createElement('button');
    const e = mockEvent('a', { target: button });
    expect(isEditableTarget(e)).toBe(false);
  });

  it('returns false for non-HTMLElement targets', () => {
    const e = mockEvent('a', { target: document });
    expect(isEditableTarget(e)).toBe(false);
  });

  it('returns false for null target', () => {
    const e = mockEvent('a', { target: null });
    expect(isEditableTarget(e)).toBe(false);
  });
});

// ── matchesShortcut ───────────────────────────────────────────────────────

describe('matchesShortcut', () => {
  it('matches a simple Ctrl+key shortcut', () => {
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const e = mockEvent('1', { ctrlKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('matches Ctrl+Shift combination', () => {
    const s = testShortcut({ key: 'D', modifiers: ['ctrl', 'shift'] });
    const e = mockEvent('D', { ctrlKey: true, shiftKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('matches Meta (Cmd) modifier', () => {
    const s = testShortcut({ key: 'b', modifiers: ['meta'] });
    const e = mockEvent('b', { metaKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('matches Alt modifier', () => {
    const s = testShortcut({ key: 'z', modifiers: ['alt'] });
    const e = mockEvent('z', { altKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('matches shortcut with no modifiers', () => {
    const s = testShortcut({ key: 'Escape', modifiers: [] });
    const e = mockEvent('Escape');
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('rejects wrong key', () => {
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const e = mockEvent('2', { ctrlKey: true });
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('rejects missing modifier', () => {
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const e = mockEvent('1'); // no ctrlKey
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('rejects extra modifier not in shortcut', () => {
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const e = mockEvent('1', { ctrlKey: true, shiftKey: true }); // extra shift
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('rejects when shortcut is disabled', () => {
    const s = testShortcut({ key: '1', modifiers: ['ctrl'], enabled: false });
    const e = mockEvent('1', { ctrlKey: true });
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('rejects when target is an input (non-Escape shortcut)', () => {
    const input = document.createElement('input');
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const e = mockEvent('1', { ctrlKey: true, target: input });
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('rejects when target is a textarea (non-Escape shortcut)', () => {
    const textarea = document.createElement('textarea');
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const e = mockEvent('1', { ctrlKey: true, target: textarea });
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('allows Escape shortcut even in input fields', () => {
    const input = document.createElement('input');
    const s = testShortcut({ key: 'Escape', modifiers: [] });
    const e = mockEvent('Escape', { target: input });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('allows Escape shortcut in textarea', () => {
    const textarea = document.createElement('textarea');
    const s = testShortcut({ key: 'Escape', modifiers: [] });
    const e = mockEvent('Escape', { target: textarea });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('allows Escape shortcut in contenteditable', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    const s = testShortcut({ key: 'Escape', modifiers: [] });
    const e = mockEvent('Escape', { target: div });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('is case-sensitive for letter keys', () => {
    const s = testShortcut({ key: 'D', modifiers: ['ctrl', 'shift'] });
    const e = mockEvent('d', { ctrlKey: true, shiftKey: true });
    expect(matchesShortcut(e, s)).toBe(false);
  });

  // cmdOrCtrl virtual modifier tests
  it('matches cmdOrCtrl shortcut with Ctrl key', () => {
    const s = testShortcut({ key: 'b', modifiers: ['cmdOrCtrl'] });
    const e = mockEvent('b', { ctrlKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('matches cmdOrCtrl shortcut with Meta key', () => {
    const s = testShortcut({ key: 'b', modifiers: ['cmdOrCtrl'] });
    const e = mockEvent('b', { metaKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('rejects cmdOrCtrl shortcut when both Ctrl and Meta are pressed', () => {
    const s = testShortcut({ key: 'b', modifiers: ['cmdOrCtrl'] });
    const e = mockEvent('b', { ctrlKey: true, metaKey: true });
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('rejects cmdOrCtrl shortcut when neither Ctrl nor Meta is pressed', () => {
    const s = testShortcut({ key: 'b', modifiers: ['cmdOrCtrl'] });
    const e = mockEvent('b');
    expect(matchesShortcut(e, s)).toBe(false);
  });

  it('matches cmdOrCtrl+shift combination with Ctrl', () => {
    const s = testShortcut({ key: 'z', modifiers: ['cmdOrCtrl', 'shift'] });
    const e = mockEvent('z', { ctrlKey: true, shiftKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('matches cmdOrCtrl+shift combination with Meta', () => {
    const s = testShortcut({ key: 'z', modifiers: ['cmdOrCtrl', 'shift'] });
    const e = mockEvent('z', { metaKey: true, shiftKey: true });
    expect(matchesShortcut(e, s)).toBe(true);
  });

  it('rejects cmdOrCtrl shortcut in editable target', () => {
    const input = document.createElement('input');
    const s = testShortcut({ key: 'b', modifiers: ['cmdOrCtrl'] });
    const e = mockEvent('b', { ctrlKey: true, target: input });
    expect(matchesShortcut(e, s)).toBe(false);
  });
});

// ── formatShortcut ────────────────────────────────────────────────────────

describe('formatShortcut', () => {
  // These tests are deterministic because IS_MAC is constant within a test run.
  // We test both paths by checking against the constant.

  it('formats Ctrl+1 correctly for the current platform', () => {
    const s = testShortcut({ key: '1', modifiers: ['ctrl'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      expect(result).toBe('⌃+1');
    } else {
      expect(result).toBe('Ctrl+1');
    }
  });

  it('formats Ctrl+Shift+D correctly', () => {
    const s = testShortcut({ key: 'D', modifiers: ['ctrl', 'shift'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      expect(result).toBe('⌃+Shift+D');
    } else {
      expect(result).toBe('Ctrl+Shift+D');
    }
  });

  it('formats Meta+B correctly', () => {
    const s = testShortcut({ key: 'b', modifiers: ['meta'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      expect(result).toBe('⌘+b');
    } else {
      expect(result).toBe('Win+b');
    }
  });

  it('formats cmdOrCtrl+B as Cmd on Mac, Ctrl on PC', () => {
    const s = testShortcut({ key: 'b', modifiers: ['cmdOrCtrl'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      expect(result).toBe('⌘+b');
    } else {
      expect(result).toBe('Ctrl+b');
    }
  });

  it('formats cmdOrCtrl+Shift combination', () => {
    const s = testShortcut({ key: 'z', modifiers: ['cmdOrCtrl', 'shift'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      expect(result).toBe('⌘+Shift+z');
    } else {
      expect(result).toBe('Ctrl+Shift+z');
    }
  });

  it('formats Escape with no modifiers', () => {
    const s = testShortcut({ key: 'Escape', modifiers: [] });
    expect(formatShortcut(s)).toBe('Esc');
  });

  it('formats Space key', () => {
    const s = testShortcut({ key: ' ', modifiers: ['ctrl'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      expect(result).toBe('⌃+Space');
    } else {
      expect(result).toBe('Ctrl+Space');
    }
  });

  it('formats all four modifiers in correct order', () => {
    const s = testShortcut({ key: 'x', modifiers: ['alt', 'ctrl', 'meta', 'shift'] });
    const result = formatShortcut(s);
    if (IS_MAC) {
      // Order: ctrl, meta, shift, alt
      expect(result).toBe('⌃+⌘+Shift+⌥+x');
    } else {
      expect(result).toBe('Ctrl+Win+Shift+Alt+x');
    }
  });

  it('maintains consistent modifier order regardless of input order', () => {
    const s1 = testShortcut({ key: 'a', modifiers: ['shift', 'ctrl'] });
    const s2 = testShortcut({ key: 'a', modifiers: ['ctrl', 'shift'] });
    expect(formatShortcut(s1)).toBe(formatShortcut(s2));
  });
});

// ── detectConflicts ───────────────────────────────────────────────────────

describe('detectConflicts', () => {
  it('returns empty array for default shortcuts (no conflicts)', () => {
    const conflicts = detectConflicts(DEFAULT_SHORTCUTS);
    expect(conflicts).toHaveLength(0);
  });

  it('detects same key+modifiers in same context', () => {
    const registry = freshRegistry();
    // Set DEV_APP_PANEL to same key as DEV_FLAGS_PANEL (both in devToolbar context)
    registry.DEV_APP_PANEL = {
      ...registry.DEV_APP_PANEL,
      key: '1',
      modifiers: ['ctrl'],
    };
    const conflicts = detectConflicts(registry);
    expect(conflicts.length).toBeGreaterThan(0);
    const ids: Str[] = conflicts.flatMap((c) => [c.a, c.b]);
    expect(ids).toContain('DEV_FLAGS_PANEL');
    expect(ids).toContain('DEV_APP_PANEL');
  });

  it('detects global shortcut conflicting with scoped shortcut', () => {
    const registry = freshRegistry();
    // Set TOGGLE_SIDEBAR (global) to same key as DEV_FLAGS_PANEL (devToolbar)
    registry.TOGGLE_SIDEBAR = {
      ...registry.TOGGLE_SIDEBAR,
      key: '1',
      modifiers: ['ctrl'],
      context: 'global',
    };
    const conflicts = detectConflicts(registry);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('allows same key+modifiers in different non-global contexts', () => {
    const registry = freshRegistry();
    // DEV_FLAGS_PANEL is in devToolbar context with Ctrl+1
    // Add a custom shortcut in editor context with Ctrl+1
    registry.DEV_APP_PANEL = {
      ...registry.DEV_APP_PANEL,
      key: '1',
      modifiers: ['ctrl'],
      context: 'editor',
    };
    const conflicts = detectConflicts(registry);
    expect(conflicts).toHaveLength(0);
  });

  it('ignores disabled shortcuts in conflict detection', () => {
    const registry = freshRegistry();
    // Make DEV_APP_PANEL conflict with DEV_FLAGS_PANEL
    registry.DEV_APP_PANEL = {
      ...registry.DEV_APP_PANEL,
      key: '1',
      modifiers: ['ctrl'],
    };
    // But disable one of them
    registry.DEV_APP_PANEL.enabled = false;
    const conflicts = detectConflicts(registry);
    expect(conflicts).toHaveLength(0);
  });

  it('handles modifiers in different order as equivalent', () => {
    const registry = freshRegistry();
    registry.DEV_APP_PANEL = {
      ...registry.DEV_APP_PANEL,
      key: 'D',
      modifiers: ['shift', 'ctrl'], // reversed order from TOGGLE_DEV_TOOLBAR
    };
    registry.DEV_APP_PANEL.context = 'global'; // same context as TOGGLE_DEV_TOOLBAR
    const conflicts = detectConflicts(registry);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});

// ── getAllShortcuts ────────────────────────────────────────────────────────

describe('getAllShortcuts', () => {
  it('returns all shortcuts as a flat array', () => {
    const all = getAllShortcuts(DEFAULT_SHORTCUTS);
    expect(all).toHaveLength(SHORTCUT_IDS.length);
  });

  it('sorts by context first', () => {
    const all = getAllShortcuts(DEFAULT_SHORTCUTS);
    const contexts: Str[] = all.map((s) => s.context);
    const sorted: Str[] = [...contexts].toSorted();
    expect(contexts).toEqual(sorted);
  });

  it('sorts by label within same context', () => {
    const all = getAllShortcuts(DEFAULT_SHORTCUTS);
    // Group by context and verify label order within each group
    const byContext = new Map<Str, Str[]>();
    for (const s of all) {
      const labels = byContext.get(s.context) ?? [];
      labels.push(s.label);
      byContext.set(s.context, labels);
    }
    for (const [, labels] of byContext) {
      const sorted = [...labels].toSorted();
      expect(labels).toEqual(sorted);
    }
  });
});

// ── updateShortcut ────────────────────────────────────────────────────────

describe('updateShortcut', () => {
  it('updates a shortcut key successfully', () => {
    const registry = freshRegistry();
    const result = updateShortcut(registry, 'TOGGLE_SIDEBAR', 'k', ['meta']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.TOGGLE_SIDEBAR.key).toBe('k');
      expect(result.data.TOGGLE_SIDEBAR.modifiers).toEqual(['meta']);
    }
  });

  it('preserves defaultKey/defaultModifiers on update', () => {
    const registry = freshRegistry();
    const originalKey = registry.TOGGLE_SIDEBAR.defaultKey;
    const originalMods = [...registry.TOGGLE_SIDEBAR.defaultModifiers];
    const result = updateShortcut(registry, 'TOGGLE_SIDEBAR', 'k', ['meta']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.TOGGLE_SIDEBAR.defaultKey).toBe(originalKey);
      expect(result.data.TOGGLE_SIDEBAR.defaultModifiers).toEqual(originalMods);
    }
  });

  it('returns error for unknown shortcut ID', () => {
    const registry = freshRegistry();
    const result = updateShortcut(registry, 'NONEXISTENT', 'x', ['ctrl']);
    expect(result.ok).toBe(false);
  });

  it('returns error when update would create a conflict', () => {
    const registry = freshRegistry();
    // Try to set TOGGLE_SIDEBAR to Ctrl+1 which conflicts with DEV_FLAGS_PANEL (global overlaps devToolbar)
    const result = updateShortcut(registry, 'TOGGLE_SIDEBAR', '1', ['ctrl']);
    expect(result.ok).toBe(false);
  });

  it('does not mutate the original registry', () => {
    const registry = freshRegistry();
    const originalKey = registry.TOGGLE_SIDEBAR.key;
    updateShortcut(registry, 'TOGGLE_SIDEBAR', 'k', ['meta']);
    expect(registry.TOGGLE_SIDEBAR.key).toBe(originalKey);
  });

  it('allows update to non-conflicting binding', () => {
    const registry = freshRegistry();
    const result = updateShortcut(registry, 'DEV_FLAGS_PANEL', '8', ['ctrl']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.DEV_FLAGS_PANEL.key).toBe('8');
    }
  });
});

// ── resetShortcut ─────────────────────────────────────────────────────────

describe('resetShortcut', () => {
  it('resets a modified shortcut to its defaults', () => {
    const registry = freshRegistry();
    // First modify it
    registry.TOGGLE_SIDEBAR = {
      ...registry.TOGGLE_SIDEBAR,
      key: 'k',
      modifiers: ['alt'],
    };
    expect(registry.TOGGLE_SIDEBAR.key).toBe('k');

    const result = resetShortcut(registry, 'TOGGLE_SIDEBAR');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.TOGGLE_SIDEBAR.key).toBe(result.data.TOGGLE_SIDEBAR.defaultKey);
      expect(result.data.TOGGLE_SIDEBAR.modifiers).toEqual(
        result.data.TOGGLE_SIDEBAR.defaultModifiers,
      );
    }
  });

  it('returns error for unknown ID', () => {
    const registry = freshRegistry();
    const result = resetShortcut(registry, 'NONEXISTENT');
    expect(result.ok).toBe(false);
  });

  it('does not mutate the original registry', () => {
    const registry = freshRegistry();
    registry.TOGGLE_SIDEBAR = { ...registry.TOGGLE_SIDEBAR, key: 'k' };
    resetShortcut(registry, 'TOGGLE_SIDEBAR');
    expect(registry.TOGGLE_SIDEBAR.key).toBe('k');
  });
});

// ── resetAllShortcuts ─────────────────────────────────────────────────────

describe('resetAllShortcuts', () => {
  it('returns a registry matching DEFAULT_SHORTCUTS', () => {
    const fresh = resetAllShortcuts();
    for (const id of SHORTCUT_IDS) {
      expect(fresh[id].key).toBe(DEFAULT_SHORTCUTS[id].key);
      expect(fresh[id].modifiers).toEqual(DEFAULT_SHORTCUTS[id].modifiers);
      expect(fresh[id].enabled).toBe(DEFAULT_SHORTCUTS[id].enabled);
    }
  });

  it('returns a new object (not the same reference)', () => {
    const fresh1 = resetAllShortcuts();
    const fresh2 = resetAllShortcuts();
    expect(fresh1).not.toBe(fresh2);
  });

  it('returned registry is mutable (not frozen)', () => {
    const fresh = resetAllShortcuts();
    expect(() => {
      fresh.TOGGLE_SIDEBAR = { ...fresh.TOGGLE_SIDEBAR, key: 'z' };
    }).not.toThrow();
  });
});

// ── Integration: realistic scenario ────────────────────────────────────────

describe('integration: full customization workflow', () => {
  it('user customizes, detects conflict, resets', () => {
    // Step 1: Start with defaults
    let registry = freshRegistry();
    expect(detectConflicts(registry)).toHaveLength(0);

    // Step 2: Update DEV_FLAGS_PANEL to Ctrl+8 (no conflict)
    const step2 = updateShortcut(registry, 'DEV_FLAGS_PANEL', '8', ['ctrl']);
    expect(step2.ok).toBe(true);
    if (step2.ok) registry = step2.data;

    // Step 3: Try to set DEV_APP_PANEL to Ctrl+8 too (conflict!)
    const step3 = updateShortcut(registry, 'DEV_APP_PANEL', '8', ['ctrl']);
    expect(step3.ok).toBe(false);

    // Step 4: Reset DEV_FLAGS_PANEL back to default
    const step4 = resetShortcut(registry, 'DEV_FLAGS_PANEL');
    expect(step4.ok).toBe(true);
    if (step4.ok) registry = step4.data;

    // Step 5: Now Ctrl+8 is free, DEV_APP_PANEL can use it
    const step5 = updateShortcut(registry, 'DEV_APP_PANEL', '8', ['ctrl']);
    expect(step5.ok).toBe(true);

    // Step 6: Verify no conflicts
    if (step5.ok) {
      expect(detectConflicts(step5.data)).toHaveLength(0);
    }
  });

  it('formatShortcut reflects customized bindings', () => {
    const registry = freshRegistry();
    const result = updateShortcut(registry, 'DEV_FLAGS_PANEL', 'F', ['ctrl', 'shift']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const formatted = formatShortcut(result.data.DEV_FLAGS_PANEL);
      if (IS_MAC) {
        expect(formatted).toBe('⌃+Shift+F');
      } else {
        expect(formatted).toBe('Ctrl+Shift+F');
      }
    }
  });
});
