/**
 * Barrel re-export for the input-chip component — exposes the
 * InputChip Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type InputChipProps, InputChipPropsSchema } from './InputChip.svelte';

export {
  Root,
  type InputChipProps,
  InputChipPropsSchema,
  //
  Root as InputChip,
};
