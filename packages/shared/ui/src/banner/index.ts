/**
 * Barrel re-export for the banner component — exposes the
 * `Banner` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BannerProps, BannerPropsSchema } from './Banner.svelte';

export {
  Root,
  type BannerProps,
  BannerPropsSchema,
  //
  Root as Banner,
};
