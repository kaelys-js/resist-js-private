/**
 * Barrel re-export for the descriptions component — exposes the
 * `Descriptions` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DescriptionsProps, DescriptionsPropsSchema } from './Descriptions.svelte';

export {
  Root,
  type DescriptionsProps,
  DescriptionsPropsSchema,
  //
  Root as Descriptions,
};
