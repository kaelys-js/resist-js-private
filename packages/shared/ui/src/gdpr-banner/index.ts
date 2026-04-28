/**
 * Barrel re-export for the gdpr-banner component — exposes
 * the GdprBanner Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type GdprBannerProps, GdprBannerPropsSchema } from './GdprBanner.svelte';

export {
  Root,
  type GdprBannerProps,
  GdprBannerPropsSchema,
  //
  Root as GdprBanner,
};
