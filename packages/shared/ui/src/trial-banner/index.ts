/**
 * Barrel re-export for the trial-banner component — exposes
 * the TrialBanner Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TrialBannerProps, TrialBannerPropsSchema } from './TrialBanner.svelte';

export {
  Root,
  type TrialBannerProps,
  TrialBannerPropsSchema,
  //
  Root as TrialBanner,
};
