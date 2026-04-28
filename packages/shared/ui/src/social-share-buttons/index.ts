/**
 * Barrel re-export for the social-share-buttons component —
 * exposes the SocialShareButtons Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type SocialShareButtonsProps,
  SocialShareButtonsPropsSchema,
} from './SocialShareButtons.svelte';

export {
  Root,
  type SocialShareButtonsProps,
  SocialShareButtonsPropsSchema,
  //
  Root as SocialShareButtons,
};
