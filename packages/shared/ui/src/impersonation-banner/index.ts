/**
 * Barrel re-export for the impersonation-banner component —
 * exposes the ImpersonationBanner Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ImpersonationBannerProps,
  ImpersonationBannerPropsSchema,
} from './ImpersonationBanner.svelte';

export {
  Root,
  type ImpersonationBannerProps,
  ImpersonationBannerPropsSchema,
  //
  Root as ImpersonationBanner,
};
