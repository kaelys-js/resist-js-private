/**
 * Barrel re-export for the stack component — exposes the
 * Stack Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type StackProps, StackPropsSchema } from './Stack.svelte';

export {
  Root,
  type StackProps,
  StackPropsSchema,
  //
  Root as Stack,
};
