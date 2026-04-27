/**
 * Barrel re-export for the bar-list component — exposes the
 * `BarList` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BarListProps, BarListPropsSchema } from './BarList.svelte';

export {
  Root,
  type BarListProps,
  BarListPropsSchema,
  //
  Root as BarList,
};
