/**
 * Barrel re-export for the scroll-velocity component —
 * exposes the ScrollVelocity Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ScrollVelocityProps, ScrollVelocityPropsSchema } from './ScrollVelocity.svelte';

export {
  Root,
  type ScrollVelocityProps,
  ScrollVelocityPropsSchema,
  //
  Root as ScrollVelocity,
};
