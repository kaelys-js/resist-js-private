/**
 * Barrel re-export for the feature-flag-toggle component —
 * exposes the FeatureFlagToggle Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type FeatureFlagToggleProps,
  FeatureFlagTogglePropsSchema,
} from './FeatureFlagToggle.svelte';

export {
  Root,
  type FeatureFlagToggleProps,
  FeatureFlagTogglePropsSchema,
  //
  Root as FeatureFlagToggle,
};
