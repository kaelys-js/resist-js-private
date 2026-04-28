/**
 * Barrel re-export for the format-number component — exposes
 * the FormatNumber Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FormatNumberProps, FormatNumberPropsSchema } from './FormatNumber.svelte';

export {
  Root,
  type FormatNumberProps,
  FormatNumberPropsSchema,
  //
  Root as FormatNumber,
};
