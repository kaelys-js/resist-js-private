/**
 * Editor-specific devtools configuration.
 *
 * Wires Storylyne editor schemas, app name, URL prefix, and SvelteKit
 * navigation into the product-agnostic {@link DevtoolsConfig} contract.
 *
 * @module
 */

import type { Str, Bool } from '@/schemas/common';
import type { DevtoolsConfig } from '@/utils/devtools/types';
import { AppPreferencesSchema, FeatureFlagsSchema } from '$lib/schemas/editor-state';
import { DebugStateSchema } from '@/utils/devtools/debug-state-schema';
import { APP_NAME, URL_PARAM_PREFIX } from '$lib/config/app-meta';
import { goto } from '$app/navigation';

/** Valid app preference keys, derived from schema. */
const APP_KEYS = new Set<string>(Object.keys(AppPreferencesSchema.entries));

/** Valid feature flag keys, derived from schema. */
const FEATURE_FLAG_KEYS = new Set<string>(Object.keys(FeatureFlagsSchema.entries));

/**
 * Returns the Storylyne editor devtools configuration.
 *
 * @returns DevtoolsConfig wired to editor-specific schemas and navigation
 */
export function getDevtoolsConfig(): DevtoolsConfig {
  return {
    appName: APP_NAME,
    urlParamPrefix: URL_PARAM_PREFIX,
    appPreferencesSchema: AppPreferencesSchema.entries as unknown as Record<
      Str,
      Record<Str, unknown>
    >,
    featureFlagsSchema: FeatureFlagsSchema.entries as unknown as Record<Str, Record<Str, unknown>>,
    debugStateSchema: DebugStateSchema.entries as unknown as Record<Str, Record<Str, unknown>>,
    goto,
    isValidAppKey: (key: Str): Bool => APP_KEYS.has(key),
    isValidFeatureFlag: (key: Str): Bool => FEATURE_FLAG_KEYS.has(key),
  };
}
