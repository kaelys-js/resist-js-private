/**
 * Shared contracts for the devtools system.
 *
 * Product-agnostic interfaces that any Svelte 5 app implements to
 * plug into the devtools toolkit (state logger, toolbar registry,
 * devtools window API, debug orchestrator).
 *
 * @module
 */

import type { Str, Bool, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';

// =============================================================================
// Log Level
// =============================================================================

/** Supported log level values in ascending severity order. */
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error'] as const;

/** Log level — products must support at least these 5 levels. */
export type LogLevel = (typeof LOG_LEVELS)[number];

// =============================================================================
// Debug State
// =============================================================================

/** Debug state shape — controls debug mode and log verbosity. */
export type DebugState = {
  readonly enabled: Bool;
  readonly logLevel: LogLevel;
};

// =============================================================================
// Store Contracts
// =============================================================================

/** Minimal debug store — any product's debug store must conform. */
export type DebugStoreContract = {
  readonly debug: DebugState;
  readonly urlOverrides: Record<Str, Str>;
  setEnabled(enabled: Bool): Result<Void>;
  setLogLevel(level: Str): Result<Void>;
};

/** Minimal app store — any product's app store must conform. */
export type AppStoreContract = {
  readonly app: Record<Str, unknown>;
  readonly features: Record<Str, Bool>;
  setFeature(flag: Str, enabled: Bool): unknown;
};

// =============================================================================
// Devtools Config
// =============================================================================

/**
 * Product-specific config injected into devtools factory functions.
 *
 * Each product creates one of these by wiring its schemas, app name,
 * URL param prefix, and SvelteKit navigation function.
 *
 * @example
 * ```typescript
 * const config: DevtoolsConfig = {
 *   appName: 'Storylyne',
 *   urlParamPrefix: 'sto.',
 *   appPreferencesSchema: AppPreferencesSchema.entries,
 *   featureFlagsSchema: FeatureFlagsSchema.entries,
 *   debugStateSchema: DebugStateSchema.entries,
 *   goto,
 *   isValidAppKey: (key) => key in AppPreferencesSchema.entries,
 *   isValidFeatureFlag: (key) => key in FeatureFlagsSchema.entries,
 * };
 * ```
 */
export type DevtoolsConfig = {
  /** Product display name (e.g., 'Storylyne', 'MyApp'). */
  appName: Str;
  /** URL param prefix (e.g., 'sto.', 'app.'). */
  urlParamPrefix: Str;
  /** Valibot v.strictObject schema entries for app preferences. */
  appPreferencesSchema: Record<Str, Record<Str, unknown>>;
  /** Valibot v.strictObject schema entries for feature flags. */
  featureFlagsSchema: Record<Str, Record<Str, unknown>>;
  /** Valibot v.strictObject schema entries for debug state. */
  debugStateSchema: Record<Str, Record<Str, unknown>>;
  /** SvelteKit goto() for URL navigation (login/logout). */
  goto(url: Str, opts?: { invalidateAll?: Bool }): Promise<void>;
  /** Checks if key is a valid app preference. */
  isValidAppKey(key: Str): Bool;
  /** Checks if key is a valid feature flag. */
  isValidFeatureFlag(key: Str): Bool;
};
