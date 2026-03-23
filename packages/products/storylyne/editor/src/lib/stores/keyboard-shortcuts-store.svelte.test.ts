/**
 * Tests for the reactive keyboard shortcuts store.
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Str, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { shortcutStore } from './keyboard-shortcuts-store.svelte';

beforeEach(() => {
  shortcutStore.resetAll();
});

describe('shortcutStore', () => {
  it('registry returns a ShortcutRegistry with all shortcut IDs', () => {
    const registry = shortcutStore.registry;
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
});
