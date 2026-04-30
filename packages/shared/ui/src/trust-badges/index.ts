/**
 * Barrel re-export for the trust-badges component — exposes
 * the TrustBadges Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TrustBadgesProps, TrustBadgesPropsSchema } from './TrustBadges.svelte';

export {
  Root,
  type TrustBadgesProps,
  TrustBadgesPropsSchema,
  //
  Root as TrustBadges,
};
