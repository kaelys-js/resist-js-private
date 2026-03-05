/**
 * Editor state schemas.
 *
 * Defines the full editor state shape: user-global app preferences (theme, locale,
 * sidebar, user profile) and per-session feature flags that toggle individual
 * UI sections on/off for testing and development.
 *
 * @module
 */

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
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(AppPreferencesSchema, { theme: 'midnight', mode: 'dark' });
 * if (!result.ok) return result;
 * const prefs = result.data;
 * ```
 */
export const AppPreferencesSchema = v.strictObject({
	/** Display name shown in the title bar and about dialog. */
	appName: v.optional(v.pipe(v.string(), v.minLength(1)), APP_NAME),
	/** Active color theme identifier. Empty string uses the default theme. */
	theme: v.optional(v.picklist(SUPPORTED_THEMES), ''),
	/** Color mode preference: light, dark, or system-detected. */
	mode: v.optional(v.picklist(SUPPORTED_MODES), 'system'),
	/** Active UI locale code for internationalization. */
	locale: v.optional(v.picklist(SUPPORTED_LOCALES), 'en'),
	/** Whether the project sidebar is open on desktop. */
	sidebarOpen: v.optional(v.boolean(), true),
	/** Current user's display name. */
	userName: v.optional(v.pipe(v.string(), v.minLength(1)), 'User'),
	/** Current user's email address (may be empty). */
	userEmail: v.optional(v.string(), ''),
	/** URL or path to the current user's avatar image. */
	userAvatar: v.optional(v.string(), ''),
	/** Artificial delay (ms) added to mock data fetches for skeleton loading testing. */
	mockDataDelay: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(10_000)), 0),
});

/** Inferred type for application preferences. */
export type AppPreferences = v.InferOutput<typeof AppPreferencesSchema>;

/**
 * Schema for editor feature flags.
 * Each flag controls visibility of a specific editor feature.
 * All default to true (enabled).
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(FeatureFlagsSchema, { sidebar: false, breadcrumb: false });
 * if (!result.ok) return result;
 * const flags = result.data;
 * ```
 */
export const FeatureFlagsSchema = v.strictObject({
	/** Show the global settings gear icon and settings panel. */
	settings: v.optional(v.boolean(), true),
	/** Show the theme color picker in settings / dev toolbar. */
	themeSelection: v.optional(v.boolean(), true),
	/** Show the language/locale selector in settings / dev toolbar. */
	languageSelection: v.optional(v.boolean(), true),
	/** Show the light/dark/system mode toggle. */
	modeToggle: v.optional(v.boolean(), true),
	/** Show the entire project sidebar panel. */
	sidebar: v.optional(v.boolean(), true),
	/** Show the Home link inside the sidebar navigation. */
	sidebarHome: v.optional(v.boolean(), true),
	/** Show the scene list panel inside the sidebar. */
	sceneList: v.optional(v.boolean(), true),
	/** Allow the sidebar to be resized by dragging its edge. */
	resizableSidebar: v.optional(v.boolean(), true),
	/** Show the breadcrumb navigation bar above the editor canvas. */
	breadcrumb: v.optional(v.boolean(), true),
	/** Show the sidebar collapse/expand toggle button. */
	sidebarToggle: v.optional(v.boolean(), true),
	/** Show the help/documentation link in the sidebar footer. */
	sidebarHelp: v.optional(v.boolean(), true),
	/** Show the project selector dropdown in the sidebar header. */
	projectDropdown: v.optional(v.boolean(), true),
	/** Show the project settings entry inside the project dropdown. */
	projectDropdownSettings: v.optional(v.boolean(), true),
	/** Show the project icon inside the project dropdown trigger. */
	projectDropdownIcon: v.optional(v.boolean(), true),
	/** Show the application icon in the sidebar header. */
	appIconInSidebar: v.optional(v.boolean(), true),
	/** Show the application name text in the sidebar header. */
	appNameInSidebar: v.optional(v.boolean(), true),
	/** Show the user profile dropdown in the top-right header. */
	headerUserDropdown: v.optional(v.boolean(), true),
	/** Show the user avatar image inside the header dropdown. */
	headerUserAvatar: v.optional(v.boolean(), true),
	/** Show the account management link in the user dropdown. */
	headerUserAccount: v.optional(v.boolean(), true),
	/** Show the subscription/billing link in the user dropdown. */
	headerUserSubscription: v.optional(v.boolean(), true),
	/** Show the notifications link in the user dropdown. */
	headerUserNotifications: v.optional(v.boolean(), true),
	/** Show the keyboard shortcuts link in the user dropdown. */
	headerUserShortcuts: v.optional(v.boolean(), true),
	/** Show the settings link in the user dropdown. */
	headerUserSettings: v.optional(v.boolean(), true),
	/** Show the "What's New" / changelog link in the user dropdown. */
	headerUserWhatsNew: v.optional(v.boolean(), true),
	/** Show the logout button in the user dropdown. */
	headerUserLogout: v.optional(v.boolean(), true),
	/** Gate UI behind authentication (show login prompts when not authenticated). */
	authGatedUi: v.optional(v.boolean(), true),
	/** Show an empty-state placeholder when no scene is loaded. */
	emptyScenePlaceholder: v.optional(v.boolean(), true),
	/** Show skeleton loading placeholders while data is being fetched. */
	skeletonLoading: v.optional(v.boolean(), true),
});

/** Inferred type for feature flags. */
export type FeatureFlags = v.InferOutput<typeof FeatureFlagsSchema>;

/**
 * Top-level editor state schema combining app preferences and feature flags.
 *
 * @example
 * ```typescript
 * import { safeParse } from '@/utils/result/safe';
 * const result = safeParse(EditorStateSchema, { app: {}, features: {} });
 * if (!result.ok) return result;
 * const state = result.data;
 * ```
 */
export const EditorStateSchema = v.strictObject({
	/** User-global application preferences (theme, locale, profile). */
	app: AppPreferencesSchema,
	/** Per-session feature flags controlling UI section visibility. */
	features: FeatureFlagsSchema,
});

/** Inferred type for the full editor state. */
export type EditorState = v.InferOutput<typeof EditorStateSchema>;
