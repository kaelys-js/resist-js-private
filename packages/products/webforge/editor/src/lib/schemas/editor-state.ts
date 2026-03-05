import * as v from 'valibot';
import { APP_NAME } from '$lib/config/app-meta';

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
	appName: v.optional(v.pipe(v.string(), v.minLength(1)), APP_NAME),
	theme: v.optional(v.picklist(SUPPORTED_THEMES), ''),
	mode: v.optional(v.picklist(SUPPORTED_MODES), 'system'),
	locale: v.optional(v.picklist(SUPPORTED_LOCALES), 'en'),
	sidebarOpen: v.optional(v.boolean(), true),
	userName: v.optional(v.pipe(v.string(), v.minLength(1)), 'User'),
	userEmail: v.optional(v.string(), ''),
	userAvatar: v.optional(v.string(), ''),
	mockDataDelay: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10_000)), 0),
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
	sidebarHome: v.optional(v.boolean(), true),
	sceneList: v.optional(v.boolean(), true),
	resizableSidebar: v.optional(v.boolean(), true),
	breadcrumb: v.optional(v.boolean(), true),
	sidebarToggle: v.optional(v.boolean(), true),
	sidebarHelp: v.optional(v.boolean(), true),
	projectDropdown: v.optional(v.boolean(), true),
	projectDropdownSettings: v.optional(v.boolean(), true),
	projectDropdownIcon: v.optional(v.boolean(), true),
	appIconInSidebar: v.optional(v.boolean(), true),
	appNameInSidebar: v.optional(v.boolean(), true),
	headerUserDropdown: v.optional(v.boolean(), true),
	headerUserAvatar: v.optional(v.boolean(), true),
	headerUserAccount: v.optional(v.boolean(), true),
	headerUserSubscription: v.optional(v.boolean(), true),
	headerUserNotifications: v.optional(v.boolean(), true),
	headerUserShortcuts: v.optional(v.boolean(), true),
	headerUserSettings: v.optional(v.boolean(), true),
	headerUserWhatsNew: v.optional(v.boolean(), true),
	headerUserLogout: v.optional(v.boolean(), true),
	authGatedUi: v.optional(v.boolean(), true),
	emptyScenePlaceholder: v.optional(v.boolean(), true),
	skeletonLoading: v.optional(v.boolean(), true),
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
