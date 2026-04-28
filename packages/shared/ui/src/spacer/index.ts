/**
 * Barrel re-export for the spacer component — exposes the
 * Spacer Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SpacerProps, SpacerPropsSchema } from './Spacer.svelte';

export {
  Root,
  type SpacerProps,
  SpacerPropsSchema,
  //
  Root as Spacer,
};
