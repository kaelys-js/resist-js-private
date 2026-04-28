/**
 * Barrel re-export for the divider component — exposes the
 * `Divider` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DividerProps, DividerPropsSchema } from './Divider.svelte';

export {
  Root,
  type DividerProps,
  DividerPropsSchema,
  //
  Root as Divider,
};
