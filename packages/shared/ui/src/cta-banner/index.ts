/**
 * Barrel re-export for the cta-banner component — exposes the
 * `CtaBanner` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CtaBannerProps, CtaBannerPropsSchema } from './CtaBanner.svelte';

export {
  Root,
  type CtaBannerProps,
  CtaBannerPropsSchema,
  //
  Root as CtaBanner,
};
