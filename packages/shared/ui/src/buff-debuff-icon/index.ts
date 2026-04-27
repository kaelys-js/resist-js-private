/**
 * Barrel re-export for the buff-debuff-icon component — exposes
 * the `BuffDebuffIcon` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BuffDebuffIconProps, BuffDebuffIconPropsSchema } from './BuffDebuffIcon.svelte';

export {
  Root,
  type BuffDebuffIconProps,
  BuffDebuffIconPropsSchema,
  //
  Root as BuffDebuffIcon,
};
