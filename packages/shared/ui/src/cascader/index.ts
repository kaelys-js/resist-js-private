/**
 * Barrel re-export for the cascader component — exposes the
 * `Cascader` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CascaderProps, CascaderPropsSchema } from './Cascader.svelte';

export {
  Root,
  type CascaderProps,
  CascaderPropsSchema,
  //
  Root as Cascader,
};
