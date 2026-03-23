/**
 * Dev Toolbar Schema Introspection Registry
 *
 * Auto-discovers feature flags, app preferences, and debug fields from
 * Valibot schemas. Generates controls dynamically — zero manual updates
 * needed when new schema fields are added.
 *
 * Product-agnostic — schemas are passed as parameters, not imported.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str, Bool } from '@/schemas/common';
import type { AppStoreContract, DebugStoreContract, DevtoolsConfig } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Schema for a discovered feature flag descriptor.
 *
 * @example
 * ```typescript
 * const flags = discoverFeatureFlags(FeatureFlagsSchema.entries);
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
 * const prefs = discoverAppPreferences(AppPreferencesSchema.entries);
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
export function introspectEntry(entry: Record<Str, unknown>): {
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
 * Discovers all feature flags from a Valibot strict object schema.
 * Returns an array of flag descriptors with key and default value.
 *
 * @param schemaEntries - The `.entries` property of a Valibot strict object schema
 * @returns Array of flag descriptors
 *
 * @example
 * ```typescript
 * const flags = discoverFeatureFlags(FeatureFlagsSchema.entries);
 * flags.forEach(flag => console.log(flag.key, flag.default));
 * ```
 */
export function discoverFeatureFlags(
  schemaEntries: Record<Str, Record<Str, unknown>>,
): FlagDescriptor[] {
  return Object.keys(schemaEntries).map((key: Str): FlagDescriptor => {
    const entry: Record<Str, unknown> = schemaEntries[key]!;
    const defaultValue: unknown = entry.default;
    return {
      key,
      default: typeof defaultValue === 'boolean' ? defaultValue : true,
    };
  });
}

/**
 * Discovers all app preference fields from a Valibot strict object schema.
 * Returns descriptors with control type (boolean/picklist/string/number) and options.
 *
 * @param schemaEntries - The `.entries` property of a Valibot strict object schema
 * @returns Array of field descriptors
 */
export function discoverAppPreferences(
  schemaEntries: Record<Str, Record<Str, unknown>>,
): FieldDescriptor[] {
  return Object.keys(schemaEntries).map((key: Str): FieldDescriptor => {
    const info: {
      type: 'boolean' | 'picklist' | 'string' | 'number';
      options?: Str[];
      default: unknown;
    } = introspectEntry(schemaEntries[key]!);
    return { key, ...info };
  });
}

/**
 * Discovers all debug state fields from a Valibot strict object schema.
 * Returns descriptors with control type and options.
 *
 * @param schemaEntries - The `.entries` property of a Valibot strict object schema
 * @returns Array of field descriptors
 */
export function discoverDebugFields(
  schemaEntries: Record<Str, Record<Str, unknown>>,
): FieldDescriptor[] {
  return Object.keys(schemaEntries).map((key: Str): FieldDescriptor => {
    const info: {
      type: 'boolean' | 'picklist' | 'string' | 'number';
      options?: Str[];
      default: unknown;
    } = introspectEntry(schemaEntries[key]!);
    return { key, ...info };
  });
}

// =============================================================================
// URL generation
// =============================================================================

/**
 * Generates a debug URL with app-prefixed params reflecting current store state.
 * Includes all app preferences, debug state, and non-default feature flags.
 *
 * @param appStore - The app state store
 * @param debugStore - The debug state store
 * @param config - Devtools config for schemas and prefix
 * @param baseUrl - Base URL to append params to (defaults to current page URL)
 * @returns Full URL string with debug params
 */
export function generateDebugUrl(
  appStore: AppStoreContract,
  debugStore: DebugStoreContract,
  config: DevtoolsConfig,
  baseUrl?: Str,
): Str {
  const base: Str =
    baseUrl ?? (typeof window === 'undefined' ? '/' : window.location.href.split('?')[0]!);
  const params: URLSearchParams = new URLSearchParams();
  const prefix: Str = config.urlParamPrefix;

  // Debug state
  params.set(`${prefix}debug`, String(debugStore.debug.enabled));
  params.set(`${prefix}logLevel`, debugStore.debug.logLevel);

  // App preferences
  const { app } = appStore;
  for (const key of Object.keys(config.appPreferencesSchema)) {
    const value: unknown = app[key as keyof typeof app];
    params.set(`${prefix}${key}`, String(value));
  }

  // Feature flags — only include non-default (disabled) flags to keep URL concise
  const { features } = appStore;
  const flags: FlagDescriptor[] = discoverFeatureFlags(
    config.featureFlagsSchema as Record<Str, Record<Str, unknown>>,
  );
  for (const flag of flags) {
    const current: Bool = features[flag.key as keyof typeof features]!;
    if (current !== flag.default) {
      params.set(`${prefix}ff.${flag.key}`, String(current));
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
 */
export function humanizeOption(key: Str, value: Str): Str {
  const fieldLabels: Record<Str, Str> | undefined = OPTION_LABELS[key];
  if (fieldLabels && value in fieldLabels) return fieldLabels[value]!;
  if (!value) return 'Default';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
