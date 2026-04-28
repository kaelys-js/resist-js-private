/**
 * Barrel re-export for the party-display component — exposes
 * the PartyDisplay Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PartyDisplayProps, PartyDisplayPropsSchema } from './PartyDisplay.svelte';

export {
  Root,
  type PartyDisplayProps,
  PartyDisplayPropsSchema,
  //
  Root as PartyDisplay,
};
