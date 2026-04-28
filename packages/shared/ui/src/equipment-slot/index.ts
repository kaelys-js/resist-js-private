/**
 * Barrel re-export for the equipment-slot component — exposes
 * the EquipmentSlot Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type EquipmentSlotProps, EquipmentSlotPropsSchema } from './EquipmentSlot.svelte';

export {
  Root,
  type EquipmentSlotProps,
  EquipmentSlotPropsSchema,
  //
  Root as EquipmentSlot,
};
