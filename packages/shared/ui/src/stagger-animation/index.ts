/**
 * Barrel re-export for the stagger-animation component —
 * exposes the StaggerAnimation Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type StaggerAnimationProps,
  StaggerAnimationPropsSchema,
} from './StaggerAnimation.svelte';

export {
  Root,
  type StaggerAnimationProps,
  StaggerAnimationPropsSchema,
  //
  Root as StaggerAnimation,
};
