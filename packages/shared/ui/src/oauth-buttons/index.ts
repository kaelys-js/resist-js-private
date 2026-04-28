/**
 * Barrel re-export for the oauth-buttons component — exposes
 * the OauthButtons Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type OauthButtonsProps, OauthButtonsPropsSchema } from './OauthButtons.svelte';

export {
  Root,
  type OauthButtonsProps,
  OauthButtonsPropsSchema,
  //
  Root as OauthButtons,
};
