/**
 * Unit tests for `subscription-plans` — verifies that
 * `getPresetForPlan` returns the expected feature-flag preset per
 * plan tier and that `applyPlanPreset` correctly merges the preset
 * onto an existing flags object without dropping unrelated keys.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { getPresetForPlan, applyPlanPreset } from './subscription-plans';
import { FeatureFlagsSchema } from '$lib/schemas/editor-state';

/** All feature flag keys from the schema. */
const ALL_FLAG_KEYS: string[] = Object.keys(FeatureFlagsSchema.entries);

// =============================================================================
// getPresetForPlan
// =============================================================================

describe('getPresetForPlan', () => {
  it('returns 10 false flags for free plan', () => {
    const preset = getPresetForPlan('free');
    const falseKeys: string[] = Object.entries(preset)
      .filter(([, v]) => v === false)
      .map(([k]) => k);

    expect(falseKeys).toHaveLength(10);
    expect(preset.settings).toBe(false);
    expect(preset.themeSelection).toBe(false);
    expect(preset.languageSelection).toBe(false);
    expect(preset.resizableSidebar).toBe(false);
    expect(preset.projectDropdown).toBe(false);
    expect(preset.projectDropdownSettings).toBe(false);
    expect(preset.projectDropdownIcon).toBe(false);
    expect(preset.headerUserNotifications).toBe(false);
    expect(preset.headerUserShortcuts).toBe(false);
    expect(preset.headerUserSettings).toBe(false);
  });

  it('returns 3 false flags for starter plan', () => {
    const preset = getPresetForPlan('starter');
    const falseKeys: string[] = Object.entries(preset)
      .filter(([, v]) => v === false)
      .map(([k]) => k);

    expect(falseKeys).toHaveLength(3);
    expect(preset.projectDropdownSettings).toBe(false);
    expect(preset.headerUserShortcuts).toBe(false);
    expect(preset.headerUserSettings).toBe(false);
  });

  it('returns empty object for pro plan', () => {
    const preset = getPresetForPlan('pro');
    expect(Object.keys(preset)).toHaveLength(0);
  });

  it('returns empty object for enterprise plan', () => {
    const preset = getPresetForPlan('enterprise');
    expect(Object.keys(preset)).toHaveLength(0);
  });

  it('returns empty object for unknown plan', () => {
    const preset = getPresetForPlan('nonexistent');
    expect(Object.keys(preset)).toHaveLength(0);
  });
});

// =============================================================================
// applyPlanPreset
// =============================================================================

describe('applyPlanPreset', () => {
  it('returns all-true FeatureFlags for pro plan', () => {
    const flags = applyPlanPreset('pro');

    for (const key of ALL_FLAG_KEYS) {
      expect(flags[key as keyof typeof flags], `${key} should be true`).toBe(true);
    }
  });

  it('returns all-true FeatureFlags for enterprise plan', () => {
    const flags = applyPlanPreset('enterprise');

    for (const key of ALL_FLAG_KEYS) {
      expect(flags[key as keyof typeof flags], `${key} should be true`).toBe(true);
    }
  });

  it('returns FeatureFlags with 10 false flags for free plan', () => {
    const flags = applyPlanPreset('free');

    // Should be false
    expect(flags.settings).toBe(false);
    expect(flags.themeSelection).toBe(false);
    expect(flags.languageSelection).toBe(false);
    expect(flags.resizableSidebar).toBe(false);
    expect(flags.projectDropdown).toBe(false);
    expect(flags.projectDropdownSettings).toBe(false);
    expect(flags.projectDropdownIcon).toBe(false);
    expect(flags.headerUserNotifications).toBe(false);
    expect(flags.headerUserShortcuts).toBe(false);
    expect(flags.headerUserSettings).toBe(false);

    // Should be true (the other 17)
    expect(flags.modeToggle).toBe(true);
    expect(flags.sidebar).toBe(true);
    expect(flags.sidebarHome).toBe(true);
    expect(flags.sceneList).toBe(true);
    expect(flags.breadcrumb).toBe(true);
    expect(flags.sidebarToggle).toBe(true);
    expect(flags.sidebarHelp).toBe(true);
    expect(flags.appIconInSidebar).toBe(true);
    expect(flags.appNameInSidebar).toBe(true);
    expect(flags.headerUserDropdown).toBe(true);
    expect(flags.headerUserAvatar).toBe(true);
    expect(flags.headerUserAccount).toBe(true);
    expect(flags.headerUserSubscription).toBe(true);
    expect(flags.headerUserWhatsNew).toBe(true);
    expect(flags.headerUserLogout).toBe(true);
    expect(flags.authGatedUi).toBe(true);
    expect(flags.emptyScenePlaceholder).toBe(true);
    expect(flags.skeletonLoading).toBe(true);
  });

  it('returns FeatureFlags with 3 false flags for starter plan', () => {
    const flags = applyPlanPreset('starter');

    expect(flags.projectDropdownSettings).toBe(false);
    expect(flags.headerUserShortcuts).toBe(false);
    expect(flags.headerUserSettings).toBe(false);

    // Everything else should be true
    const trueCount: number = Object.values(flags).filter((v) => v === true).length;
    expect(trueCount).toBe(ALL_FLAG_KEYS.length - 3);
  });

  it('returns all keys matching FeatureFlagsSchema', () => {
    const flags = applyPlanPreset('pro');
    const flagKeys: string[] = Object.keys(flags).toSorted();
    const schemaKeys: string[] = [...ALL_FLAG_KEYS].toSorted();
    expect(flagKeys).toEqual(schemaKeys);
  });

  it('returns all-true for unknown plan', () => {
    const flags = applyPlanPreset('nonexistent');

    for (const key of ALL_FLAG_KEYS) {
      expect(flags[key as keyof typeof flags], `${key} should be true`).toBe(true);
    }
  });
});
