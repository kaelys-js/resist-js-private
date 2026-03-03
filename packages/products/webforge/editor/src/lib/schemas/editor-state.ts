import * as v from 'valibot';

/**
 * Supported locale codes for the editor UI.
 */
export const SUPPORTED_LOCALES = ['en', 'ja', 'zh', 'ko', 'fr', 'de', 'es'] as const;

/**
 * Supported color theme identifiers. Empty string = default (no theme override).
 */
export const SUPPORTED_THEMES = [
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

/**
 * Supported color mode preferences.
 */
export const SUPPORTED_MODES = ['light', 'dark', 'system'] as const;

/**
 * Schema for user-global application preferences.
 * Persisted to localStorage.
 */
export const AppPreferencesSchema = v.strictObject({
	appName: v.optional(v.pipe(v.string(), v.minLength(1)), 'WebForge'),
	theme: v.optional(v.picklist(SUPPORTED_THEMES), ''),
	mode: v.optional(v.picklist(SUPPORTED_MODES), 'system'),
	locale: v.optional(v.picklist(SUPPORTED_LOCALES), 'en'),
	sidebarOpen: v.optional(v.boolean(), true),
});

/** Inferred type for application preferences. */
export type AppPreferences = v.InferOutput<typeof AppPreferencesSchema>;

/**
 * Schema for editor feature flags.
 * Each flag controls visibility of a specific editor feature.
 * All default to true (enabled).
 */
export const FeatureFlagsSchema = v.strictObject({
	settings: v.optional(v.boolean(), true),
	themeSelection: v.optional(v.boolean(), true),
	languageSelection: v.optional(v.boolean(), true),
	modeToggle: v.optional(v.boolean(), true),
	sidebar: v.optional(v.boolean(), true),
	sceneList: v.optional(v.boolean(), true),
	assetBrowser: v.optional(v.boolean(), true),
});

/** Inferred type for feature flags. */
export type FeatureFlags = v.InferOutput<typeof FeatureFlagsSchema>;

/**
 * Top-level editor state schema combining app preferences and feature flags.
 */
export const EditorStateSchema = v.strictObject({
	app: AppPreferencesSchema,
	features: FeatureFlagsSchema,
});

/** Inferred type for the full editor state. */
export type EditorState = v.InferOutput<typeof EditorStateSchema>;
