/**
 * Subscription plan → feature flag preset mapping.
 *
 * Each plan defines which feature flags are disabled. Missing flags default
 * to `true` (enabled). Used by `EditorStore.setSubscriptionPlan()` to
 * bulk-apply presets when the user's plan tier changes.
 *
 * Plan tiers:
 * - **Free** — 7 flags disabled (no settings, themes, languages, resizable sidebar, shortcuts)
 * - **Starter** — 2 flags disabled (no shortcuts, settings in user menu)
 * - **Pro** — all features enabled
 * - **Enterprise** — all features enabled
 *
 * @module
 */

import type { Str } from '@/schemas/common';
import { SUPPORTED_PLANS, FeatureFlagsSchema, type FeatureFlags } from '$lib/schemas/editor-state';

// =============================================================================
// Types
// =============================================================================

/** A supported subscription plan tier. */
type Plan = (typeof SUPPORTED_PLANS)[number];

// =============================================================================
// Plan presets
// =============================================================================

/**
 * Feature flags disabled per plan tier.
 *
 * Each entry lists only the flags that are `false` for that plan.
 * All unmentioned flags default to `true` (enabled).
 */
const PLAN_PRESETS: Record<Plan, Partial<FeatureFlags>> = {
  free: {
    settings: false,
    themeSelection: false,
    languageSelection: false,
    resizableSidebar: false,
    headerUserNotifications: false,
    headerUserShortcuts: false,
    headerUserSettings: false,
  },
  starter: {
    headerUserShortcuts: false,
    headerUserSettings: false,
  },
  pro: {},
  enterprise: {},
};

// =============================================================================
// Baseline
// =============================================================================

/**
 * All-true feature flags baseline, derived from `FeatureFlagsSchema` entries.
 * Used as the starting point before applying plan restrictions.
 */
const ALL_ENABLED: FeatureFlags = Object.fromEntries(
  // Schema introspection — FeatureFlagsSchema.entries keys are the flag names
  Object.keys(FeatureFlagsSchema.entries as unknown as Record<Str, unknown>).map((key: Str) => [
    key,
    true,
  ]),
) as FeatureFlags;

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns the partial feature flag overrides for a subscription plan.
 *
 * Unknown plans return an empty object (no restrictions), which is safe
 * because `applyPlanPreset` will produce all-true flags.
 *
 * @param plan - Plan tier identifier (e.g. `'free'`, `'pro'`)
 * @returns Partial FeatureFlags with only the disabled flags set to `false`
 *
 * @example
 * ```typescript
 * const preset = getPresetForPlan('free');
 * // { settings: false, themeSelection: false, ... } (10 entries)
 *
 * const preset = getPresetForPlan('pro');
 * // {} (empty — all enabled)
 * ```
 */
export function getPresetForPlan(plan: Str): Partial<FeatureFlags> {
  // Validate against known plans — unknown plans get no restrictions
  if (!SUPPORTED_PLANS.includes(plan as Plan)) return {};
  return { ...PLAN_PRESETS[plan as Plan] };
}

/**
 * Returns a complete `FeatureFlags` object with the plan's restrictions applied.
 *
 * All flags start as `true`, then the plan's `false` flags are spread on top.
 * This ensures every flag key exists in the result with the correct value.
 *
 * @param plan - Plan tier identifier (e.g. `'free'`, `'starter'`)
 * @returns Complete FeatureFlags object
 *
 * @example
 * ```typescript
 * const flags = applyPlanPreset('free');
 * flags.settings;          // false
 * flags.modeToggle;        // true
 *
 * const allFlags = applyPlanPreset('pro');
 * // All 27 flags are true
 * ```
 */
export function applyPlanPreset(plan: Str): FeatureFlags {
  const preset: Partial<FeatureFlags> = getPresetForPlan(plan);
  return { ...ALL_ENABLED, ...preset };
}
