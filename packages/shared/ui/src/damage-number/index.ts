/**
 * Barrel re-export for the damage-number component — exposes
 * the `DamageNumber` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type DamageNumberProps, DamageNumberPropsSchema } from './DamageNumber.svelte';

export {
  Root,
  type DamageNumberProps,
  DamageNumberPropsSchema,
  //
  Root as DamageNumber,
};
