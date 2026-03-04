/**
 * Dev Toolbar Schema Introspection Registry
 *
 * Auto-discovers feature flags, app preferences, and debug fields from
 * Valibot schemas. Generates controls dynamically — zero manual updates
 * needed when new schema fields are added.
 *
 * @module
 */

import {
	AppPreferencesSchema,
	FeatureFlagsSchema,
	type FeatureFlags,
} from '$lib/schemas/editor-state';
import { DebugStateSchema } from '$lib/schemas/debug-state';
import type { EditorStore } from '$lib/stores/editor-state.svelte';
import type { DebugStore } from '$lib/stores/debug-state.svelte';

// =============================================================================
// Types
// =============================================================================

/**
 * Descriptor for a discovered feature flag.
 *
 * @example
 * ```typescript
 * const flags = discoverFeatureFlags();
 * // [{ key: 'settings', default: true }, { key: 'sceneList', default: true }, ...]
 * ```
 */
export type FlagDescriptor = {
	/** Schema key name (e.g., 'settings', 'sceneList'). */
	key: string;
	/** Default boolean value from the schema. */
	default: boolean;
};

/**
 * Descriptor for a discovered schema field with control type information.
 *
 * @example
 * ```typescript
 * const prefs = discoverAppPreferences();
 * // [{ key: 'theme', type: 'picklist', options: ['', 'midnight', ...], default: '' }, ...]
 * ```
 */
export type FieldDescriptor = {
	/** Schema key name (e.g., 'theme', 'sidebarOpen'). */
	key: string;
	/** Control type to render: Switch for boolean, Select for picklist, Input for string. */
	type: 'boolean' | 'picklist' | 'string';
	/** Available options for picklist fields. Undefined for non-picklist types. */
	options?: readonly string[];
	/** Default value from the schema. */
	default: unknown;
};

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
function introspectEntry(entry: Record<string, unknown>): {
	type: 'boolean' | 'picklist' | 'string';
	options?: readonly string[];
	default: unknown;
} {
	// Unwrap v.optional() — entry.type === 'optional', entry.wrapped is inner schema
	const defaultValue: unknown = entry.default;
	let inner: Record<string, unknown> = entry;

	if (entry.type === 'optional' && entry.wrapped) {
		inner = entry.wrapped as Record<string, unknown>;
	}

	// Unwrap v.pipe() — inner.type === 'pipe', inner.pipe is array of schemas
	if (inner.type === 'pipe' && Array.isArray(inner.pipe)) {
		inner = inner.pipe[0] as Record<string, unknown>;
	}

	// Detect type
	if (inner.type === 'boolean') {
		return { type: 'boolean', default: defaultValue };
	}

	if (inner.type === 'picklist' && Array.isArray(inner.options)) {
		return {
			type: 'picklist',
			options: inner.options as readonly string[],
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
	const entries = FeatureFlagsSchema.entries as unknown as Record<string, Record<string, unknown>>;
	return Object.keys(entries).map((key: string): FlagDescriptor => {
		const entry = entries[key];
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
	const entries = AppPreferencesSchema.entries as unknown as Record<
		string,
		Record<string, unknown>
	>;
	return Object.keys(entries).map((key: string): FieldDescriptor => {
		const info = introspectEntry(entries[key]);
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
	const entries = DebugStateSchema.entries as unknown as Record<string, Record<string, unknown>>;
	return Object.keys(entries).map((key: string): FieldDescriptor => {
		const info = introspectEntry(entries[key]);
		return { key, ...info };
	});
}

// =============================================================================
// URL generation
// =============================================================================

/**
 * Generates a debug URL with `wf.*` params reflecting current store state.
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
	baseUrl?: string,
): string {
	const base: string =
		baseUrl ?? (typeof window === 'undefined' ? '/' : window.location.href.split('?')[0]);
	const params = new URLSearchParams();

	// Debug state
	params.set('wf.debug', String(debugStore.debug.enabled));
	params.set('wf.logLevel', debugStore.debug.logLevel);

	// App preferences
	const { app } = editorStore;
	for (const key of Object.keys(AppPreferencesSchema.entries)) {
		const value: unknown = app[key as keyof typeof app];
		params.set(`wf.${key}`, String(value));
	}

	// Feature flags — only include non-default (disabled) flags to keep URL concise
	const { features } = editorStore;
	const flags = discoverFeatureFlags();
	for (const flag of flags) {
		const current: boolean = features[flag.key as keyof FeatureFlags];
		if (current !== flag.default) {
			params.set(`wf.ff.${flag.key}`, String(current));
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
export function humanizeKey(key: string): string {
	// Insert space before uppercase letters, then capitalize first letter
	const spaced: string = key.replaceAll(/([A-Z])/g, ' $1');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
