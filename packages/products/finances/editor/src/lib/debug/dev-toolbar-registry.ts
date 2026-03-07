/**
 * Dev Toolbar Schema Introspection Registry
 *
 * Auto-discovers feature flags, app preferences, and debug fields from
 * Valibot schemas. Generates controls dynamically — zero manual updates
 * needed when new schema fields are added.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str, Bool } from '@/schemas/common';
import {
	AppPreferencesSchema,
	FeatureFlagsSchema,
	type FeatureFlags,
} from '$lib/schemas/editor-state';
import { DebugStateSchema, URL_PARAM_PREFIX } from '$lib/schemas/debug-state';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';

// =============================================================================
// Types
// =============================================================================

/**
 * Schema for a discovered feature flag descriptor.
 *
 * @example
 * ```typescript
 * const flags = discoverFeatureFlags();
 * // [{ key: 'settings', default: true }, { key: 'sceneList', default: true }, ...]
 * ```
 */
export const FlagDescriptorSchema = v.strictObject({
	/** Schema key name (e.g., 'settings', 'sceneList'). */
	key: v.string(),
	/** Default boolean value from the schema. */
	default: v.boolean(),
});

/** A discovered feature flag descriptor. */
export type FlagDescriptor = v.InferOutput<typeof FlagDescriptorSchema>;

/** Valid field control types for UI rendering. */
const FieldControlTypeSchema = v.picklist(['boolean', 'picklist', 'string', 'number']);

/**
 * Schema for a discovered schema field with control type information.
 *
 * @example
 * ```typescript
 * const prefs = discoverAppPreferences();
 * // [{ key: 'theme', type: 'picklist', options: ['', 'midnight', ...], default: '' }, ...]
 * ```
 */
export const FieldDescriptorSchema = v.strictObject({
	/** Schema key name (e.g., 'theme', 'sidebarOpen'). */
	key: v.string(),
	/** Control type to render: Switch for boolean, Select for picklist, Input for string/number. */
	type: FieldControlTypeSchema,
	/** Available options for picklist fields. Undefined for non-picklist types. */
	options: v.optional(v.array(v.string())),
	/** Default value from the schema. */
	default: v.unknown(),
});

/** A discovered schema field with control type information. */
export type FieldDescriptor = v.InferOutput<typeof FieldDescriptorSchema>;

// =============================================================================
// Valibot introspection helpers
// =============================================================================

/**
 * Unwraps a Valibot schema entry to find its inner type.
 * Handles `v.optional(inner, default)` and `v.pipe(inner, ...)` wrappers.
 *
 * @param entry - A Valibot schema node
 * @returns Object with detected type, options array, and default value
 */
function introspectEntry(entry: Record<Str, unknown>): {
	type: 'boolean' | 'picklist' | 'string' | 'number';
	options?: Str[];
	default: unknown;
} {
	// Unwrap v.optional() — entry.type === 'optional', entry.wrapped is inner schema
	const defaultValue: unknown = entry.default;
	// Schema introspection — cast required for Valibot internal structure walking
	let inner: Record<Str, unknown> = entry;

	if (entry.type === 'optional' && entry.wrapped) {
		// Schema introspection — unwrapping v.optional() wrapper
		inner = entry.wrapped as Record<Str, unknown>;
	}

	// Unwrap v.pipe() — inner.type === 'pipe', inner.pipe is array of schemas
	if (inner.type === 'pipe' && Array.isArray(inner.pipe)) {
		// Schema introspection — unwrapping v.pipe() to get base schema
		inner = inner.pipe[0] as Record<Str, unknown>;
	}

	// Detect type
	if (inner.type === 'boolean') {
		return { type: 'boolean', default: defaultValue };
	}

	if (inner.type === 'number') {
		return { type: 'number', default: defaultValue };
	}

	if (inner.type === 'picklist' && Array.isArray(inner.options)) {
		return {
			type: 'picklist',
			// Schema introspection — Valibot's picklist options are readonly string arrays
			options: inner.options as Str[],
			default: defaultValue,
		};
	}

	// Default to string for v.string() and any other types
	return { type: 'string', default: defaultValue };
}

// =============================================================================
// Discovery functions
// =============================================================================

/**
 * Discovers all feature flags from `FeatureFlagsSchema`.
 * Returns an array of flag descriptors with key and default value.
 * Automatically includes new flags added to the schema.
 *
 * @returns Array of flag descriptors
 *
 * @example
 * ```typescript
 * const flags = discoverFeatureFlags();
 * flags.forEach(flag => console.log(flag.key, flag.default));
 * ```
 */
export function discoverFeatureFlags(): FlagDescriptor[] {
	// Schema introspection — cast required for Valibot schema entry walking
	const entries = FeatureFlagsSchema.entries as unknown as Record<Str, Record<Str, unknown>>;
	return Object.keys(entries).map((key: Str): FlagDescriptor => {
		const entry: Record<Str, unknown> = entries[key];
		const defaultValue: unknown = entry.default;
		return {
			key,
			default: typeof defaultValue === 'boolean' ? defaultValue : true,
		};
	});
}

/**
 * Discovers all app preference fields from `AppPreferencesSchema`.
 * Returns descriptors with control type (boolean/picklist/string) and options.
 * Automatically includes new fields added to the schema.
 *
 * @returns Array of field descriptors
 *
 * @example
 * ```typescript
 * const prefs = discoverAppPreferences();
 * prefs.forEach(pref => {
 *   if (pref.type === 'picklist') console.log(pref.key, pref.options);
 * });
 * ```
 */
export function discoverAppPreferences(): FieldDescriptor[] {
	// Schema introspection — cast required for Valibot schema entry walking
	const entries = AppPreferencesSchema.entries as unknown as Record<Str, Record<Str, unknown>>;
	return Object.keys(entries).map((key: Str): FieldDescriptor => {
		const info: {
			type: 'boolean' | 'picklist' | 'string' | 'number';
			options?: Str[];
			default: unknown;
		} = introspectEntry(entries[key]);
		return { key, ...info };
	});
}

/**
 * Discovers all debug state fields from `DebugStateSchema`.
 * Returns descriptors with control type and options.
 * Automatically includes new fields added to the schema.
 *
 * @returns Array of field descriptors
 *
 * @example
 * ```typescript
 * const fields = discoverDebugFields();
 * fields.forEach(field => console.log(field.key, field.type));
 * ```
 */
export function discoverDebugFields(): FieldDescriptor[] {
	// Schema introspection — cast required for Valibot schema entry walking
	const entries = DebugStateSchema.entries as unknown as Record<Str, Record<Str, unknown>>;
	return Object.keys(entries).map((key: Str): FieldDescriptor => {
		const info: {
			type: 'boolean' | 'picklist' | 'string' | 'number';
			options?: Str[];
			default: unknown;
		} = introspectEntry(entries[key]);
		return { key, ...info };
	});
}

// =============================================================================
// URL generation
// =============================================================================

/**
 * Generates a debug URL with `${URL_PARAM_PREFIX}*` params reflecting current store state.
 * Includes all app preferences, debug state, and non-default feature flags.
 *
 * @param editorStore - The editor state store
 * @param debugStore - The debug state store
 * @param baseUrl - Base URL to append params to (defaults to current page URL)
 * @returns Full URL string with debug params
 *
 * @example
 * ```typescript
 * const url = generateDebugUrl(editorStore, debugStore);
 * await navigator.clipboard.writeText(url);
 * ```
 */
export function generateDebugUrl(
	editorStore: EditorStore,
	debugStore: DebugStore,
	baseUrl?: Str,
): Str {
	const base: Str =
		baseUrl ?? (typeof window === 'undefined' ? '/' : window.location.href.split('?')[0]);
	const params: URLSearchParams = new URLSearchParams();

	// Debug state
	params.set(`${URL_PARAM_PREFIX}debug`, String(debugStore.debug.enabled));
	params.set(`${URL_PARAM_PREFIX}logLevel`, debugStore.debug.logLevel);

	// App preferences
	const { app } = editorStore;
	for (const key of Object.keys(AppPreferencesSchema.entries)) {
		const value: unknown = app[key as keyof typeof app];
		params.set(`${URL_PARAM_PREFIX}${key}`, String(value));
	}

	// Feature flags — only include non-default (disabled) flags to keep URL concise
	const { features } = editorStore;
	const flags: FlagDescriptor[] = discoverFeatureFlags();
	for (const flag of flags) {
		const current: Bool = features[flag.key as keyof FeatureFlags];
		if (current !== flag.default) {
			params.set(`${URL_PARAM_PREFIX}ff.${flag.key}`, String(current));
		}
	}

	return `${base}?${params.toString()}`;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Converts a camelCase key to Title Case with spaces.
 *
 * @param key - camelCase string (e.g., 'sceneList', 'projectDropdownSettings')
 * @returns Human-readable string (e.g., 'Scene List', 'Project Dropdown Settings')
 *
 * @example
 * ```typescript
 * humanizeKey('sceneList'); // 'Scene List'
 * humanizeKey('appName');   // 'App Name'
 * ```
 */
export function humanizeKey(key: Str): Str {
	// Insert space before uppercase letters, then capitalize first letter
	const spaced: Str = key.replaceAll(/([A-Z])/g, ' $1');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Known display labels for picklist option values, keyed by field key. */
const OPTION_LABELS: Record<Str, Record<Str, Str>> = {
	theme: { '': 'Default' },
	locale: {
		en: 'English',
		ja: 'Japanese',
		zh: 'Chinese',
		ko: 'Korean',
		fr: 'French',
		de: 'German',
		es: 'Spanish',
	},
	subscriptionPlan: {
		free: 'Free',
		starter: 'Starter',
		pro: 'Pro',
		enterprise: 'Enterprise',
	},
};

/**
 * Returns a human-readable display label for a picklist option value.
 * Uses known labels for specific fields (e.g., locale codes → language names),
 * falls back to capitalizing the raw value.
 *
 * @param key - The field key (e.g., 'theme', 'locale', 'mode')
 * @param value - The raw option value (e.g., 'en', 'midnight', '')
 * @returns Human-readable label
 *
 * @example
 * ```typescript
 * humanizeOption('locale', 'ja');  // 'Japanese'
 * humanizeOption('theme', '');     // 'Default'
 * humanizeOption('mode', 'dark');  // 'Dark'
 * ```
 */
export function humanizeOption(key: Str, value: Str): Str {
	const fieldLabels: Record<Str, Str> | undefined = OPTION_LABELS[key];
	if (fieldLabels && value in fieldLabels) return fieldLabels[value];
	if (!value) return 'Default';
	return value.charAt(0).toUpperCase() + value.slice(1);
}
