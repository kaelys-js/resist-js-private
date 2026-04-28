/**
 * Barrel re-export for the size-selector component — exposes
 * the SizeSelector Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SizeSelectorProps, SizeSelectorPropsSchema } from './SizeSelector.svelte';

export {
  Root,
  type SizeSelectorProps,
  SizeSelectorPropsSchema,
  //
  Root as SizeSelector,
};
