/**
 * Barrel re-export for the press-mentions component — exposes
 * the PressMentions Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PressMentionsProps, PressMentionsPropsSchema } from './PressMentions.svelte';

export {
  Root,
  type PressMentionsProps,
  PressMentionsPropsSchema,
  //
  Root as PressMentions,
};
