/**
 * Barrel re-export for the shine-border component — exposes
 * the ShineBorder Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ShineBorderProps, ShineBorderPropsSchema } from './ShineBorder.svelte';

export {
  Root,
  type ShineBorderProps,
  ShineBorderPropsSchema,
  //
  Root as ShineBorder,
};
