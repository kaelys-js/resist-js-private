import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Bool, NullableStr, Str, Void } from '@/schemas/common';
import {
  createEditorStore,
  initEditorStore,
  useEditorStore,
  STORAGE_KEY,
} from './editor-state.svelte';
import { APP_NAME, storageKey } from '$lib/config/app-meta';

// Mock localStorage — jsdom's built-in localStorage is incomplete
const storage = new Map<Str, Str>();
vi.stubGlobal('localStorage', {
  getItem: (key: Str): NullableStr => storage.get(key) ?? null,
  setItem: (key: Str, value: Str): Void => {
    storage.set(key, value);
  },
  removeItem: (key: Str): Void => {
    storage.delete(key);
  },
  clear: (): Void => {
    storage.clear();
  },
});

describe('EditorStore', () => {
  beforeEach(() => {
    storage.clear();
  });

  // ── Factory ────────────────────────────────────────────────────────────

  it('createEditorStore() returns ok Result with default state', () => {
    const result = createEditorStore();
    expect(result.ok).toBe(true);
  });

  // ── Default values ─────────────────────────────────────────────────────

  it('store.app has correct defaults', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    expect(store.app.appName).toBe(APP_NAME);
    expect(store.app.theme).toBe('');
    expect(store.app.mode).toBe('system');
    expect(store.app.locale).toBe('en');
    expect(store.app.sidebarOpen).toBe(true);
  });

  it('store.features has all 26 flags true by default', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    expect(store.features.showCharts).toBe(true);
    expect(store.features.showInflation).toBe(true);
    expect(store.features.showProjections).toBe(true);
    expect(store.features.showNetPosition).toBe(true);
    expect(store.features.settings).toBe(true);
    expect(store.features.themeSelection).toBe(true);
    expect(store.features.languageSelection).toBe(true);
    expect(store.features.modeToggle).toBe(true);
    expect(store.features.sidebar).toBe(true);
    expect(store.features.resizableSidebar).toBe(true);
    expect(store.features.breadcrumb).toBe(true);
    expect(store.features.sidebarToggle).toBe(true);
    expect(store.features.sidebarHelp).toBe(true);
    expect(store.features.appIconInSidebar).toBe(true);
    expect(store.features.appNameInSidebar).toBe(true);
    expect(store.features.headerUserDropdown).toBe(true);
    expect(store.features.headerUserAvatar).toBe(true);
    expect(store.features.headerUserAccount).toBe(true);
    expect(store.features.headerUserSubscription).toBe(true);
    expect(store.features.headerUserNotifications).toBe(true);
    expect(store.features.headerUserShortcuts).toBe(true);
    expect(store.features.headerUserSettings).toBe(true);
    expect(store.features.headerUserWhatsNew).toBe(true);
    expect(store.features.headerUserLogout).toBe(true);
    expect(store.features.authGatedUi).toBe(true);
    expect(store.features.skeletonLoading).toBe(true);
  });

  // ── setTheme ───────────────────────────────────────────────────────────

  it("setTheme('midnight') updates store.app.theme", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setTheme('midnight');
    expect(setResult.ok).toBe(true);
    expect(store.app.theme).toBe('midnight');
  });

  it("setTheme('invalid') returns error Result, state unchanged", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setTheme('invalid');
    expect(setResult.ok).toBe(false);
    expect(store.app.theme).toBe('');
  });

  // ── setMode ────────────────────────────────────────────────────────────

  it("setMode('dark') updates store.app.mode", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setMode('dark');
    expect(setResult.ok).toBe(true);
    expect(store.app.mode).toBe('dark');
  });

  it("setMode('invalid') returns error Result", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setMode('invalid');
    expect(setResult.ok).toBe(false);
    expect(store.app.mode).toBe('system');
  });

  // ── setLocale ──────────────────────────────────────────────────────────

  it("setLocale('ja') updates store.app.locale", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setLocale('ja');
    expect(setResult.ok).toBe(true);
    expect(store.app.locale).toBe('ja');
  });

  it("setLocale('xx') returns error Result", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setLocale('xx');
    expect(setResult.ok).toBe(false);
    expect(store.app.locale).toBe('en');
  });

  // ── setAppName ─────────────────────────────────────────────────────────

  it("setAppName('My Editor') updates store.app.appName", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setAppName('My Editor');
    expect(setResult.ok).toBe(true);
    expect(store.app.appName).toBe('My Editor');
  });

  it("setAppName('') returns error Result (minLength 1)", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setAppName('');
    expect(setResult.ok).toBe(false);
    expect(store.app.appName).toBe(APP_NAME);
  });

  // ── setSidebarOpen ─────────────────────────────────────────────────────

  it('setSidebarOpen(false) updates store.app.sidebarOpen', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setSidebarOpen(false);
    expect(setResult.ok).toBe(true);
    expect(store.app.sidebarOpen).toBe(false);
  });

  // ── setFeature ─────────────────────────────────────────────────────────

  it("setFeature('settings', false) updates store.features.settings", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setFeature('settings', false);
    expect(setResult.ok).toBe(true);
    expect(store.features.settings).toBe(false);
  });

  it("setFeature('nonexistent', false) returns error Result", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setFeature('nonexistent', false);
    expect(setResult.ok).toBe(false);
  });

  // ── setSubscriptionPlan ───────────────────────────────────────────────

  it("setSubscriptionPlan('free') sets plan and disables 7 feature flags", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setSubscriptionPlan('free');
    expect(setResult.ok).toBe(true);
    expect(store.app.subscriptionPlan).toBe('free');

    // 7 flags should be false
    expect(store.features.settings).toBe(false);
    expect(store.features.themeSelection).toBe(false);
    expect(store.features.languageSelection).toBe(false);
    expect(store.features.resizableSidebar).toBe(false);
    expect(store.features.headerUserNotifications).toBe(false);
    expect(store.features.headerUserShortcuts).toBe(false);
    expect(store.features.headerUserSettings).toBe(false);

    // Other flags should still be true
    expect(store.features.modeToggle).toBe(true);
    expect(store.features.sidebar).toBe(true);
    expect(store.features.headerUserDropdown).toBe(true);
  });

  it("setSubscriptionPlan('starter') sets plan and disables 2 feature flags", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setSubscriptionPlan('starter');
    expect(setResult.ok).toBe(true);
    expect(store.app.subscriptionPlan).toBe('starter');

    expect(store.features.headerUserShortcuts).toBe(false);
    expect(store.features.headerUserSettings).toBe(false);

    // Other flags should be true
    expect(store.features.settings).toBe(true);
    expect(store.features.themeSelection).toBe(true);
  });

  it("setSubscriptionPlan('pro') sets plan and enables all flags", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    // First switch to free to disable some
    store.setSubscriptionPlan('free');
    expect(store.features.settings).toBe(false);

    // Switch to pro — should re-enable all
    const setResult = store.setSubscriptionPlan('pro');
    expect(setResult.ok).toBe(true);
    expect(store.app.subscriptionPlan).toBe('pro');
    expect(store.features.settings).toBe(true);
    expect(store.features.themeSelection).toBe(true);
    expect(store.features.headerUserSettings).toBe(true);
  });

  it("setSubscriptionPlan('enterprise') enables all flags", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setSubscriptionPlan('enterprise');
    expect(setResult.ok).toBe(true);
    expect(store.app.subscriptionPlan).toBe('enterprise');
    expect(store.features.settings).toBe(true);
  });

  it("setSubscriptionPlan('invalid') returns error, state unchanged", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const setResult = store.setSubscriptionPlan('invalid');
    expect(setResult.ok).toBe(false);
    expect(store.app.subscriptionPlan).toBe('pro');
  });

  it("after setSubscriptionPlan('free'), individual setFeature still works", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    store.setSubscriptionPlan('free');
    expect(store.features.settings).toBe(false);

    // Override individual flag
    const setResult = store.setFeature('settings', true);
    expect(setResult.ok).toBe(true);
    expect(store.features.settings).toBe(true);
  });

  it('setSubscriptionPlan persists to localStorage', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    store.setSubscriptionPlan('starter');

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.app.subscriptionPlan).toBe('starter');
    expect(parsed.features.headerUserShortcuts).toBe(false);
  });

  // ── save / load ────────────────────────────────────────────────────────

  it(`save() writes to localStorage key '${storageKey('editor-state')}'`, () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    const saveResult = store.save();
    expect(saveResult.ok).toBe(true);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.app.appName).toBe(APP_NAME);
    expect(parsed.features.settings).toBe(true);
  });

  it('load() reads from localStorage and hydrates state', () => {
    const saved = {
      app: {
        appName: 'Custom',
        theme: 'midnight',
        mode: 'dark',
        locale: 'ja',
        sidebarOpen: false,
      },
      features: {
        settings: false,
        themeSelection: true,
        languageSelection: true,
        modeToggle: true,
        sidebar: true,
        showCharts: false,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    expect(store.app.appName).toBe('Custom');
    expect(store.app.theme).toBe('midnight');
    expect(store.app.mode).toBe('dark');
    expect(store.app.locale).toBe('ja');
    expect(store.app.sidebarOpen).toBe(false);
    expect(store.features.settings).toBe(false);
    expect(store.features.showCharts).toBe(false);
  });

  it('load() with corrupted localStorage returns error, state stays at defaults', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    // Should fall back to defaults when localStorage is corrupted
    expect(store.app.appName).toBe(APP_NAME);
    expect(store.app.theme).toBe('');
    expect(store.app.mode).toBe('system');
  });

  // ── Auto-save ──────────────────────────────────────────────────────────

  it('setTheme() triggers auto-save (localStorage updated)', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    store.setTheme('midnight');

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.app.theme).toBe('midnight');
  });

  // ── setTheme — all supported themes ───────────────────────────────────

  it('setTheme() accepts all 12 supported theme values', () => {
    const themes: readonly Str[] = [
      '',
      'midnight',
      'warm',
      'forest',
      'ocean',
      'rose',
      'lavender',
      'sunset',
      'slate',
      'copper',
      'aurora',
      'amethyst',
    ];
    for (const theme of themes) {
      const result = createEditorStore();
      if (!result.ok) throw new Error('Store creation failed');
      const setResult = result.data.setTheme(theme);
      expect(setResult.ok, `theme '${theme}' should be accepted`).toBe(true);
      expect(result.data.app.theme).toBe(theme);
    }
  });

  // ── setMode — all supported modes ─────────────────────────────────────

  it("setMode('light') updates store.app.mode", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const setResult = result.data.setMode('light');
    expect(setResult.ok).toBe(true);
    expect(result.data.app.mode).toBe('light');
  });

  it("setMode('system') updates store.app.mode", () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    result.data.setMode('dark');
    const setResult = result.data.setMode('system');
    expect(setResult.ok).toBe(true);
    expect(result.data.app.mode).toBe('system');
  });

  // ── setLocale — all supported locales ─────────────────────────────────

  it('setLocale() accepts all 7 supported locale codes', () => {
    const locales: readonly Str[] = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'];
    for (const locale of locales) {
      const result = createEditorStore();
      if (!result.ok) throw new Error('Store creation failed');
      const setResult = result.data.setLocale(locale);
      expect(setResult.ok, `locale '${locale}' should be accepted`).toBe(true);
      expect(result.data.app.locale).toBe(locale);
    }
  });

  // ── setAppName — edge cases ───────────────────────────────────────────

  it('setAppName() accepts unicode characters', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const setResult = result.data.setAppName('ウェブフォージ');
    expect(setResult.ok).toBe(true);
    expect(result.data.app.appName).toBe('ウェブフォージ');
  });

  it('setAppName() accepts single character', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const setResult = result.data.setAppName('X');
    expect(setResult.ok).toBe(true);
    expect(result.data.app.appName).toBe('X');
  });

  // ── setSidebarOpen — both values ──────────────────────────────────────

  it('setSidebarOpen(true) on already-true is ok', () => {
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const setResult = result.data.setSidebarOpen(true);
    expect(setResult.ok).toBe(true);
    expect(result.data.app.sidebarOpen).toBe(true);
  });

  // ── setFeature — all 26 flags ─────────────────────────────────────────

  it('setFeature() toggles all 26 flags individually', () => {
    const flags: readonly Str[] = [
      'showCharts',
      'showInflation',
      'showProjections',
      'showNetPosition',
      'settings',
      'themeSelection',
      'languageSelection',
      'modeToggle',
      'sidebar',
      'resizableSidebar',
      'breadcrumb',
      'sidebarToggle',
      'sidebarHelp',
      'appIconInSidebar',
      'appNameInSidebar',
      'headerUserDropdown',
      'headerUserAvatar',
      'headerUserAccount',
      'headerUserSubscription',
      'headerUserNotifications',
      'headerUserShortcuts',
      'headerUserSettings',
      'headerUserWhatsNew',
      'headerUserLogout',
      'authGatedUi',
      'skeletonLoading',
    ];
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    const store = result.data;

    for (const flag of flags) {
      const off = store.setFeature(flag, false);
      expect(off.ok, `setFeature('${flag}', false) should succeed`).toBe(true);
      expect((store.features as Record<Str, Bool>)[flag], `${flag} should be false`).toBe(false);

      const on = store.setFeature(flag, true);
      expect(on.ok, `setFeature('${flag}', true) should succeed`).toBe(true);
      expect((store.features as Record<Str, Bool>)[flag], `${flag} should be true`).toBe(true);
    }
  });

  // ── Persistence — round-trip ──────────────────────────────────────────

  it('save/load round-trip preserves non-default values', () => {
    const r1 = createEditorStore();
    if (!r1.ok) throw new Error('Store creation failed');
    const s1 = r1.data;

    s1.setAppName('Custom');
    s1.setTheme('ocean');
    s1.setMode('light');
    s1.setLocale('ko');
    s1.setSidebarOpen(false);
    s1.setFeature('settings', false);
    s1.save();

    // New store loads from localStorage
    const r2 = createEditorStore();
    if (!r2.ok) throw new Error('Store creation failed');
    const s2 = r2.data;

    expect(s2.app.appName).toBe('Custom');
    expect(s2.app.theme).toBe('ocean');
    expect(s2.app.mode).toBe('light');
    expect(s2.app.locale).toBe('ko');
    expect(s2.app.sidebarOpen).toBe(false);
    expect(s2.features.settings).toBe(false);
    expect(s2.features.themeSelection).toBe(true);
  });

  it('load() with empty localStorage keeps defaults', () => {
    storage.clear();
    const result = createEditorStore();
    if (!result.ok) throw new Error('Store creation failed');
    expect(result.data.app.appName).toBe(APP_NAME);
    expect(result.data.app.mode).toBe('system');
  });

  // ── Factory resets state ──────────────────────────────────────────────

  it('createEditorStore() resets state to defaults (ignoring stale module state)', () => {
    const r1 = createEditorStore();
    if (!r1.ok) throw new Error('Store creation failed');
    r1.data.setTheme('midnight');
    r1.data.setLocale('ja');
    storage.clear(); // clear so load() doesn't re-hydrate

    const r2 = createEditorStore();
    if (!r2.ok) throw new Error('Store creation failed');
    expect(r2.data.app.theme).toBe('');
    expect(r2.data.app.locale).toBe('en');
  });

  // ── Singleton — initEditorStore / useEditorStore ──────────────────────

  it('initEditorStore() returns an EditorStore', () => {
    const store = initEditorStore();
    expect(store.app.appName).toBe(APP_NAME);
  });

  it('useEditorStore() returns the same singleton after init', () => {
    const s1 = initEditorStore();
    const s2 = useEditorStore();
    expect(s2).toBe(s1);
  });
});
