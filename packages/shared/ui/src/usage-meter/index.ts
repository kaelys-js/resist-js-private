/**
 * Barrel re-export for the usage-meter component — exposes
 * the UsageMeter Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type UsageMeterProps, UsageMeterPropsSchema } from './UsageMeter.svelte';

export {
  Root,
  type UsageMeterProps,
  UsageMeterPropsSchema,
  //
  Root as UsageMeter,
};
