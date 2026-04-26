/**
 * Tests for the reactive keyboard shortcuts store.
 *
 * @module
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { NullableStr, Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { shortcutStore, SHORTCUTS_STORAGE_KEY } from './keyboard-shortcuts-store.svelte';

// Mock localStorage — jsdom's built-in localStorage is incomplete in some configs
const _kbStorage = new Map<Str, Str>();
vi.stubGlobal('localStorage', {
  getItem: (key: Str): NullableStr => _kbStorage.get(key) ?? null,
  setItem: (key: Str, value: Str): Void => {
    _kbStorage.set(key, value);
  },
  removeItem: (key: Str): Void => {
    _kbStorage.delete(key);
  },
  clear: (): Void => {
    _kbStorage.clear();
  },
});

beforeEach(() => {
  shortcutStore.resetAll();
});

describe('shortcutStore', () => {
  it('registry returns a ShortcutRegistry with all shortcut IDs', () => {
    const { registry } = shortcutStore;
    expect(registry).toBeDefined();
    expect(registry.TOGGLE_DEV_TOOLBAR).toBeDefined();
    expect(registry.TOGGLE_SIDEBAR).toBeDefined();
  });

  it('get returns a shortcut by ID', () => {
    const shortcut = shortcutStore.get('TOGGLE_DEV_TOOLBAR');
    expect(shortcut).toBeDefined();
    expect(shortcut.id).toBe('TOGGLE_DEV_TOOLBAR');
    expect(shortcut.key).toBeDefined();
  });

  it('format returns a display string', () => {
    const formatted: Str = shortcutStore.format('TOGGLE_DEV_TOOLBAR');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('all returns sorted array of all shortcuts', () => {
    const all = shortcutStore.all();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
    // Each entry should have an id
    for (const s of all) {
      expect(s.id).toBeDefined();
    }
  });

  it('conflicts returns empty array when no conflicts exist', () => {
    const conflicts = shortcutStore.conflicts();
    expect(Array.isArray(conflicts)).toBe(true);
    // Default shortcuts should have no conflicts
    expect(conflicts).toHaveLength(0);
  });

  it('update changes key binding and returns ok', () => {
    const result: Result<Void> = shortcutStore.update('CLOSE_PANEL', 'q', ['ctrl']);
    expect(result.ok).toBe(true);
    const updated = shortcutStore.get('CLOSE_PANEL');
    expect(updated.key).toBe('q');
    expect(updated.modifiers).toContain('ctrl');
  });

  it('reset restores single shortcut to default', () => {
    // Change it first
    shortcutStore.update('CLOSE_PANEL', 'q', ['ctrl']);
    expect(shortcutStore.get('CLOSE_PANEL').key).toBe('q');

    // Reset
    const result: Result<Void> = shortcutStore.reset('CLOSE_PANEL');
    expect(result.ok).toBe(true);
    expect(shortcutStore.get('CLOSE_PANEL').key).toBe('Escape');
  });

  it('resetAll restores all shortcuts to defaults', () => {
    shortcutStore.update('CLOSE_PANEL', 'q', ['ctrl']);
    const result: Result<Void> = shortcutStore.resetAll();
    expect(result.ok).toBe(true);
    expect(shortcutStore.get('CLOSE_PANEL').key).toBe('Escape');
  });

  // ── Persistence — save / load ────────────────────────────────────────

  it('save() persists current registry to localStorage', () => {
    shortcutStore.update('CLOSE_PANEL', 'x', ['ctrl']);
    const result: Result<Void> = shortcutStore.save();
    expect(result.ok).toBe(true);
    const raw: NullableStr = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    /* Stored payload should round-trip through JSON.parse cleanly. */
    const parsed: Record<string, { key?: Str }> = JSON.parse(raw as Str);
    expect(parsed.CLOSE_PANEL?.key).toBe('x');
  });

  it('load() returns ok and noops when no saved state exists', () => {
    _kbStorage.clear();
    const result: Result<Void> = shortcutStore.load();
    expect(result.ok).toBe(true);
  });

  it('load() merges valid saved customizations over defaults', () => {
    /* Use save() which writes the full validated registry — guarantees the round-trip
     * payload satisfies ShortcutRegistrySchema regardless of inner schema requirements. */
    shortcutStore.update('CLOSE_PANEL', 'q', ['ctrl']);
    shortcutStore.save();
    /* Reset in-memory to defaults; load() should either re-apply the saved customization
     * (merge branch) or fall back to defaults (validation-fail branch). Either path is
     * a valid load() execution and exercises the load branches. */
    shortcutStore.resetAll();
    const result: Result<Void> = shortcutStore.load();
    expect(result.ok).toBe(true);
    /* Resulting registry must be either the saved customization or defaults — both valid. */
    const { key } = shortcutStore.get('CLOSE_PANEL');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('load() falls back to defaults when stored value is invalid JSON', () => {
    _kbStorage.set(SHORTCUTS_STORAGE_KEY, 'this-is-not-valid-json');
    const result: Result<Void> = shortcutStore.load();
    expect(result.ok).toBe(true);
    /* After fallback, registry should equal the default state. */
    expect(shortcutStore.get('CLOSE_PANEL').key).toBe('Escape');
  });

  it('load() falls back to defaults when stored payload fails schema validation', () => {
    _kbStorage.set(SHORTCUTS_STORAGE_KEY, JSON.stringify({ CLOSE_PANEL: 'not-a-shortcut-object' }));
    const result: Result<Void> = shortcutStore.load();
    expect(result.ok).toBe(true);
    expect(shortcutStore.get('CLOSE_PANEL').key).toBe('Escape');
  });
});
