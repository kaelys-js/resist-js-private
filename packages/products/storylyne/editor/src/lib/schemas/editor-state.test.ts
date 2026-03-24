import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import {
  AppPreferencesSchema,
  EditorStateSchema,
  FeatureFlagsSchema,
  type AppPreferences,
  type FeatureFlags,
} from './editor-state';
import { APP_NAME } from '$lib/config/app-meta';

describe('AppPreferencesSchema', () => {
  it('accepts empty object and fills all defaults', () => {
    const result = safeParse(AppPreferencesSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const prefs: AppPreferences = result.data;
    expect(prefs.appName).toBe(APP_NAME);
    expect(prefs.theme).toBe('');
    expect(prefs.mode).toBe('system');
    expect(prefs.locale).toBe('en');
    expect(prefs.sidebarOpen).toBe(true);
    expect(prefs.mockDataDelay).toBe(0);
  });

  it('accepts full valid object', () => {
    const result = safeParse(AppPreferencesSchema, {
      appName: 'My Editor',
      theme: 'midnight',
      mode: 'dark',
      locale: 'ja',
      sidebarOpen: false,
      mockDataDelay: 500,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.appName).toBe('My Editor');
    expect(result.data.theme).toBe('midnight');
    expect(result.data.mode).toBe('dark');
    expect(result.data.locale).toBe('ja');
    expect(result.data.sidebarOpen).toBe(false);
    expect(result.data.mockDataDelay).toBe(500);
  });

  it('rejects invalid theme value', () => {
    const result = safeParse(AppPreferencesSchema, { theme: 'neon' });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid mode value', () => {
    const result = safeParse(AppPreferencesSchema, { mode: 'auto' });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid locale value', () => {
    const result = safeParse(AppPreferencesSchema, { locale: 'xx' });
    expect(result.ok).toBe(false);
  });

  it('rejects empty appName', () => {
    const result = safeParse(AppPreferencesSchema, { appName: '' });
    expect(result.ok).toBe(false);
  });

  it('accepts all supported themes', () => {
    const themes = [
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
    ] as const;
    for (const theme of themes) {
      const result = safeParse(AppPreferencesSchema, { theme });
      expect(result.ok, `theme '${theme}' should be valid`).toBe(true);
    }
  });

  it('accepts all supported locales', () => {
    const locales = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'] as const;
    for (const locale of locales) {
      const result = safeParse(AppPreferencesSchema, { locale });
      expect(result.ok, `locale '${locale}' should be valid`).toBe(true);
    }
  });
});

describe('FeatureFlagsSchema', () => {
  it('accepts empty object with all 15 defaults true', () => {
    const result = safeParse(FeatureFlagsSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const flags: FeatureFlags = result.data;
    expect(flags.settings).toBe(true);
    expect(flags.themeSelection).toBe(true);
    expect(flags.languageSelection).toBe(true);
    expect(flags.modeToggle).toBe(true);
    expect(flags.sidebar).toBe(true);
    expect(flags.sidebarHome).toBe(true);
    expect(flags.sceneList).toBe(true);
    expect(flags.resizableSidebar).toBe(true);
    expect(flags.breadcrumb).toBe(true);
    expect(flags.sidebarToggle).toBe(true);
    expect(flags.sidebarHelp).toBe(true);
    expect(flags.projectDropdown).toBe(true);
    expect(flags.projectDropdownSettings).toBe(true);
    expect(flags.projectDropdownIcon).toBe(true);
    expect(flags.appIconInSidebar).toBe(true);
    expect(flags.appNameInSidebar).toBe(true);
    expect(flags.authGatedUi).toBe(true);
    expect(flags.emptyScenePlaceholder).toBe(true);
    expect(flags.skeletonLoading).toBe(true);
  });

  it('has exactly 28 flag keys', () => {
    const result = safeParse(FeatureFlagsSchema, {});
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(Object.keys(result.data)).toHaveLength(28);
  });

  it('accepts partial override with only new flags', () => {
    const result = safeParse(FeatureFlagsSchema, {
      breadcrumb: false,
      sidebarToggle: false,
      appIconInSidebar: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.breadcrumb).toBe(false);
    expect(result.data.sidebarToggle).toBe(false);
    expect(result.data.appIconInSidebar).toBe(false);
    // Unset flags default to true
    expect(result.data.settings).toBe(true);
    expect(result.data.projectDropdown).toBe(true);
  });

  it('accepts partial override with existing flags', () => {
    const result = safeParse(FeatureFlagsSchema, {
      settings: false,
      sceneList: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.settings).toBe(false);
    expect(result.data.sceneList).toBe(false);
    expect(result.data.themeSelection).toBe(true);
  });

  it('all new flag keys are present in schema entries', () => {
    const newFlags = [
      'breadcrumb',
      'sidebarToggle',
      'sidebarHelp',
      'projectDropdown',
      'projectDropdownSettings',
      'projectDropdownIcon',
      'appIconInSidebar',
      'appNameInSidebar',
    ];
    const schemaKeys = Object.keys(FeatureFlagsSchema.entries);
    for (const flag of newFlags) {
      expect(schemaKeys, `schema should contain '${flag}'`).toContain(flag);
    }
  });
});

describe('EditorStateSchema', () => {
  it('accepts nested valid object', () => {
    const result = safeParse(EditorStateSchema, {
      app: { appName: 'Test', theme: 'forest', mode: 'light', locale: 'ko', sidebarOpen: false },
      features: { settings: false },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.app.appName).toBe('Test');
    expect(result.data.app.theme).toBe('forest');
    expect(result.data.features.settings).toBe(false);
    expect(result.data.features.modeToggle).toBe(true);
  });

  it('accepts empty nested objects (all defaults)', () => {
    const result = safeParse(EditorStateSchema, { app: {}, features: {} });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.app.appName).toBe(APP_NAME);
    expect(result.data.features.sidebar).toBe(true);
  });

  it('rejects unknown keys in app (strictObject)', () => {
    const result = safeParse(EditorStateSchema, {
      app: { unknownKey: 'value' },
      features: {},
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys in features (strictObject)', () => {
    const result = safeParse(EditorStateSchema, {
      app: {},
      features: { unknownFlag: true },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown keys at top level', () => {
    const result = safeParse(EditorStateSchema, {
      app: {},
      features: {},
      extra: 'nope',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects missing app key', () => {
    const result = safeParse(EditorStateSchema, { features: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects missing features key', () => {
    const result = safeParse(EditorStateSchema, { app: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects null app value', () => {
    const result = safeParse(EditorStateSchema, { app: null, features: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects non-object app value', () => {
    const result = safeParse(EditorStateSchema, { app: 'string', features: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects non-boolean feature flag', () => {
    const result = safeParse(EditorStateSchema, {
      app: {},
      features: { settings: 'yes' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects numeric appName', () => {
    const result = safeParse(EditorStateSchema, {
      app: { appName: 123 },
      features: {},
    });
    expect(result.ok).toBe(false);
  });
});
