/**
 * Barrel re-export for the chip-group component — exposes the
 * `ChipGroup` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ChipGroupProps, ChipGroupPropsSchema } from './ChipGroup.svelte';

export {
  Root,
  type ChipGroupProps,
  ChipGroupPropsSchema,
  //
  Root as ChipGroup,
};
