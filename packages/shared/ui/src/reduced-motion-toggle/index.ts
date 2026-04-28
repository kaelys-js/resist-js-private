/**
 * Barrel re-export for the reduced-motion-toggle component —
 * exposes the ReducedMotionToggle Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type ReducedMotionToggleProps,
  ReducedMotionTogglePropsSchema,
} from './ReducedMotionToggle.svelte';

export {
  Root,
  type ReducedMotionToggleProps,
  ReducedMotionTogglePropsSchema,
  //
  Root as ReducedMotionToggle,
};
