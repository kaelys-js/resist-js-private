/**
 * Barrel re-export for the z-stack component — exposes the
 * ZStack Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ZStackProps, ZStackPropsSchema } from './ZStack.svelte';

export {
  Root,
  type ZStackProps,
  ZStackPropsSchema,
  //
  Root as ZStack,
};
