/**
 * Barrel re-export for the chip component — exposes the `Chip`
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type ChipProps, ChipPropsSchema } from './Chip.svelte';

export {
  Root,
  type ChipProps,
  ChipPropsSchema,
  //
  Root as Chip,
};
