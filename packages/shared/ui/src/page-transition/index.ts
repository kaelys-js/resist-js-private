/**
 * Barrel re-export for the page-transition component —
 * exposes the PageTransition Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type PageTransitionProps, PageTransitionPropsSchema } from './PageTransition.svelte';

export {
  Root,
  type PageTransitionProps,
  PageTransitionPropsSchema,
  //
  Root as PageTransition,
};
