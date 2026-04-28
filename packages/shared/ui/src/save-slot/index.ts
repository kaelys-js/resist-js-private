/**
 * Barrel re-export for the save-slot component — exposes
 * the SaveSlot Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SaveSlotProps, SaveSlotPropsSchema } from './SaveSlot.svelte';

export {
  Root,
  type SaveSlotProps,
  SaveSlotPropsSchema,
  //
  Root as SaveSlot,
};
