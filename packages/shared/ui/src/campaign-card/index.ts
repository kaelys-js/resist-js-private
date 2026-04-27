/**
 * Barrel re-export for the campaign-card component — exposes
 * the `CampaignCard` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CampaignCardProps, CampaignCardPropsSchema } from './CampaignCard.svelte';

export {
  Root,
  type CampaignCardProps,
  CampaignCardPropsSchema,
  //
  Root as CampaignCard,
};
