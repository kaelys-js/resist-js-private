/**
 * Barrel re-export for the view-transition component —
 * exposes the ViewTransition Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ViewTransitionProps, ViewTransitionPropsSchema } from './ViewTransition.svelte';

export {
  Root,
  type ViewTransitionProps,
  ViewTransitionPropsSchema,
  //
  Root as ViewTransition,
};
