/**
 * Barrel re-export for the transition component — exposes
 * the Transition Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TransitionProps, TransitionPropsSchema } from './Transition.svelte';

export {
  Root,
  type TransitionProps,
  TransitionPropsSchema,
  //
  Root as Transition,
};
