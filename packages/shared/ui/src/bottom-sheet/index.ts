/**
 * Barrel re-export for the bottom-sheet component — exposes the
 * `BottomSheet` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BottomSheetProps, BottomSheetPropsSchema } from './BottomSheet.svelte';

export {
  Root,
  type BottomSheetProps,
  BottomSheetPropsSchema,
  //
  Root as BottomSheet,
};
