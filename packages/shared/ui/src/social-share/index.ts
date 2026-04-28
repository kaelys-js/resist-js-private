/**
 * Barrel re-export for the social-share component — exposes
 * the SocialShare Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SocialShareProps, SocialSharePropsSchema } from './SocialShare.svelte';

export {
  Root,
  type SocialShareProps,
  SocialSharePropsSchema,
  //
  Root as SocialShare,
};
