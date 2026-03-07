/**
 * Editor locale schema — defines the shape of all translatable strings.
 *
 * @module
 */

import * as v from 'valibot';
import { messageTemplate } from '@/locale/template';

/**
 * Editor locale schema — defines all translatable strings.
 *
 * Namespaces: meta, common, sidebar, header, settings, project, scenes, debug, devToolbar, home, errors.
 * Each key uses `messageTemplate()` for static strings or
 * `messageTemplate({ param: Schema })` for parameterized strings.
 *
 * @example
 * ```typescript
 * const result = safeParse(EditorLocaleSchema, en);
 * if (!result.ok) return result;
 * ```
 */
export const EditorLocaleSchema = v.strictObject({
	meta: v.strictObject({
		tagline: messageTemplate(),
		description: messageTemplate({ appName: v.string() }),
	}),
	common: v.strictObject({
		settings: messageTemplate(),
		help: messageTemplate(),
		rename: messageTemplate(),
		duplicate: messageTemplate(),
		delete: messageTemplate(),
		cancel: messageTemplate(),
		save: messageTemplate(),
		close: messageTemplate(),
		loading: messageTemplate(),
		skipToContent: messageTemplate(),
		toggleMode: messageTemplate(),
		sidebarLabel: messageTemplate(),
		more: messageTemplate(),
	}),
	sidebar: v.strictObject({
		home: messageTemplate(),
		scenes: messageTemplate(),
		newScene: messageTemplate(),
	}),
	header: v.strictObject({
		home: messageTemplate(),
		scene: messageTemplate(),
		error: messageTemplate(),
		toggleSidebar: messageTemplate(),
	}),
	settings: v.strictObject({
		appearance: messageTemplate(),
		theme: messageTemplate(),
		language: messageTemplate(),
		toggleTheme: messageTemplate(),
		light: messageTemplate(),
		dark: messageTemplate(),
		system: messageTemplate(),
		themeDefault: messageTemplate(),
		themeMidnight: messageTemplate(),
		themeWarm: messageTemplate(),
		themeForest: messageTemplate(),
		themeOcean: messageTemplate(),
		themeRose: messageTemplate(),
		themeLavender: messageTemplate(),
		themeSunset: messageTemplate(),
		themeSlate: messageTemplate(),
		themeCopper: messageTemplate(),
		themeAurora: messageTemplate(),
		themeAmethyst: messageTemplate(),
		searchThemes: messageTemplate(),
		searchLanguages: messageTemplate(),
		noThemesFound: messageTemplate(),
		noLanguagesFound: messageTemplate(),
	}),
	project: v.strictObject({
		openProject: messageTemplate(),
		project: messageTemplate(),
	}),
	user: v.strictObject({
		user: messageTemplate(),
		account: messageTemplate(),
		subscription: messageTemplate(),
		notifications: messageTemplate(),
		keyboardShortcuts: messageTemplate(),
		settings: messageTemplate(),
		whatsNew: messageTemplate(),
		logout: messageTemplate(),
		userMenu: messageTemplate(),
	}),
	data: v.strictObject({
		loading: messageTemplate(),
		noScenes: messageTemplate(),
		noScenesDescription: messageTemplate(),
		newScene: messageTemplate(),
		signInPrompt: messageTemplate(),
		signIn: messageTemplate(),
	}),
	scenes: v.strictObject({
		rename: messageTemplate(),
		duplicate: messageTemplate(),
		delete: messageTemplate(),
	}),
	debug: v.strictObject({
		enabled: messageTemplate(),
		disabled: messageTemplate(),
		logLevel: messageTemplate({ level: v.string() }),
		urlOverride: messageTemplate({ key: v.string(), value: v.string() }),
	}),
	devToolbar: v.strictObject({
		title: messageTemplate(),
		featureFlags: messageTemplate(),
		featureFlagsBadge: messageTemplate({ enabled: v.string(), total: v.string() }),
		appPreferences: messageTemplate(),
		debugSettings: messageTemplate(),
		cycleTheme: messageTemplate({ mode: v.string() }),
		copyStateJson: messageTemplate(),
		resetAllDefaults: messageTemplate(),
		expandToolbar: messageTemplate(),
		collapseToolbar: messageTemplate(),
		searchFlags: messageTemplate(),
		clearSearch: messageTemplate(),
		noResultsFound: messageTemplate(),
		noResultsHint: messageTemplate(),
		enableAll: messageTemplate(),
		disableAll: messageTemplate(),
		search: messageTemplate(),
		noMatch: messageTemplate(),
		resetToDefaults: messageTemplate(),
		quickActions: messageTemplate(),
		logState: messageTemplate(),
		logFeatures: messageTemplate(),
		copyDebugUrl: messageTemplate(),
		logged: messageTemplate(),
		resetDone: messageTemplate(),
		sectionApp: messageTemplate(),
		sectionUser: messageTemplate(),
		sectionScenes: messageTemplate(),
		logIn: messageTemplate(),
		logOut: messageTemplate(),
		simulateEmptyScenes: messageTemplate(),
		urlOverrides: messageTemplate(),
		buildInfo: messageTemplate(),
		copyBuildInfo: messageTemplate(),
		logLevelTrace: messageTemplate(),
		logLevelDebug: messageTemplate(),
		logLevelInfo: messageTemplate(),
		logLevelWarn: messageTemplate(),
		logLevelError: messageTemplate(),
		performance: messageTemplate(),
		webVitals: messageTemplate(),
		noDataYet: messageTemplate(),
		deviceConnection: messageTemplate(),
		connectionQuality: messageTemplate(),
		networkSpeed: messageTemplate(),
		deviceMemory: messageTemplate(),
		cpuCores: messageTemplate(),
		dataSaver: messageTemplate(),
		lowEndDevice: messageTemplate(),
		lowEndExperience: messageTemplate(),
		beacon: messageTemplate(),
		queuedMetrics: messageTemplate(),
		sessionId: messageTemplate(),
		lastSent: messageTemplate(),
		never: messageTemplate(),
		flushHint: messageTemplate(),
		qualityFast: messageTemplate(),
		qualityMedium: messageTemplate(),
		qualitySlow: messageTemplate(),
		qualityUnknown: messageTemplate(),
		/** Rating label for "good" vitals score. */
		ratingGood: messageTemplate(),
		/** Rating label for "needs improvement" vitals score. */
		ratingNeedsWork: messageTemplate(),
		/** Rating label for "poor" vitals score. */
		ratingPoor: messageTemplate(),
		/** Tooltip explaining the "Last Sent" beacon timestamp. */
		lastSentTooltip: messageTemplate(),
		/** Localized "good" label used in threshold display. */
		thresholdGood: messageTemplate(),
		/** Localized "poor" label used in threshold display. */
		thresholdPoor: messageTemplate(),
		// ── Diagnostic finding labels (vitals-diagnostics.ts) ────────────
		/** Diagnostic label: LCP element identification. */
		diagLcpElement: messageTemplate(),
		/** Diagnostic label: resource URL. */
		diagResource: messageTemplate(),
		/** Diagnostic label: timing breakdown. */
		diagTiming: messageTemplate(),
		/** Diagnostic label: render time. */
		diagRenderTime: messageTemplate(),
		/** Diagnostic label: load time. */
		diagLoadTime: messageTemplate(),
		/** Diagnostic label: element pixel area. */
		diagElementSize: messageTemplate(),
		/** Diagnostic label: CLS layout shift count. */
		diagLayoutShifts: messageTemplate(),
		/** Diagnostic label: largest single layout shift. */
		diagLargestShift: messageTemplate(),
		/** Diagnostic label: TTFB network waterfall. */
		diagWaterfall: messageTemplate(),
		/** Diagnostic label: biggest timing bottleneck. */
		diagBottleneck: messageTemplate(),
		/** Diagnostic label: render-blocking resources. */
		diagRenderBlocking: messageTemplate(),
		/** Diagnostic label: TTFB impact on first paint. */
		diagTtfbImpact: messageTemplate(),
		/** Diagnostic label: informational note. */
		diagNote: messageTemplate(),
		/** Diagnostic label: slowest interaction. */
		diagSlowest: messageTemplate(),
		/** Diagnostic label: INP timing breakdown. */
		diagBreakdown: messageTemplate(),
		/** Diagnostic label: interaction count. */
		diagInteractions: messageTemplate(),
		/** Diagnostic label: long task count. */
		diagLongTasks: messageTemplate(),
		/** Diagnostic label: longest blocking task. */
		diagLongest: messageTemplate(),
		/** Diagnostic value: no interactions recorded yet. */
		diagNoInteractions: messageTemplate(),
		/** Diagnostic value: no long tasks observed. */
		diagNoneLongTasks: messageTemplate(),
		planFree: messageTemplate(),
		planStarter: messageTemplate(),
		planPro: messageTemplate(),
		planEnterprise: messageTemplate(),
		labels: v.strictObject({
			// Feature flag labels
			settings: messageTemplate(),
			themeSelection: messageTemplate(),
			languageSelection: messageTemplate(),
			modeToggle: messageTemplate(),
			sidebar: messageTemplate(),
			sidebarHome: messageTemplate(),
			sceneList: messageTemplate(),
			resizableSidebar: messageTemplate(),
			breadcrumb: messageTemplate(),
			sidebarToggle: messageTemplate(),
			sidebarHelp: messageTemplate(),
			projectDropdown: messageTemplate(),
			projectDropdownSettings: messageTemplate(),
			projectDropdownIcon: messageTemplate(),
			appIconInSidebar: messageTemplate(),
			appNameInSidebar: messageTemplate(),
			headerUserDropdown: messageTemplate(),
			headerUserAvatar: messageTemplate(),
			headerUserAccount: messageTemplate(),
			headerUserSubscription: messageTemplate(),
			headerUserNotifications: messageTemplate(),
			headerUserShortcuts: messageTemplate(),
			headerUserSettings: messageTemplate(),
			headerUserWhatsNew: messageTemplate(),
			headerUserLogout: messageTemplate(),
			authGatedUi: messageTemplate(),
			emptyScenePlaceholder: messageTemplate(),
			skeletonLoading: messageTemplate(),
			// App preference labels
			appName: messageTemplate(),
			theme: messageTemplate(),
			mode: messageTemplate(),
			locale: messageTemplate(),
			sidebarOpen: messageTemplate(),
			userName: messageTemplate(),
			userEmail: messageTemplate(),
			userAvatar: messageTemplate(),
			mockDataDelay: messageTemplate(),
			subscriptionPlan: messageTemplate(),
			// Debug field labels
			enabled: messageTemplate(),
			logLevel: messageTemplate(),
			// Build info labels
			version: messageTemplate(),
			commit: messageTemplate(),
			branch: messageTemplate(),
			dirty: messageTemplate(),
			built: messageTemplate(),
			dirtyYes: messageTemplate(),
			dirtyNo: messageTemplate(),
		}),
	}),
	home: v.strictObject({
		welcome: messageTemplate({ appName: v.string() }),
		selectScene: messageTemplate(),
		orCreateNew: messageTemplate(),
	}),
	errors: v.strictObject({
		badRequest: messageTemplate(),
		badRequestDescription: messageTemplate(),
		notFound: messageTemplate(),
		notFoundDescription: messageTemplate(),
		forbidden: messageTemplate(),
		forbiddenDescription: messageTemplate(),
		serverError: messageTemplate(),
		serverErrorDescription: messageTemplate(),
		genericTitle: messageTemplate(),
		genericDescription: messageTemplate(),
		goHome: messageTemplate(),
		tryAgain: messageTemplate(),
		errorId: messageTemplate({ id: v.string() }),
		copied: messageTemplate(),
		copyFailed: messageTemplate(),
		copyErrorId: messageTemplate(),
	}),
});

/** Inferred raw locale data shape — unprocessed message templates. */
export type EditorLocaleRaw = v.InferOutput<typeof EditorLocaleSchema>;
