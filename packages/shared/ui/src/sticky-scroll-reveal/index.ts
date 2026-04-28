/**
 * Barrel re-export for the sticky-scroll-reveal component —
 * exposes the StickyScrollReveal Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type StickyScrollRevealProps,
  StickyScrollRevealPropsSchema,
} from './StickyScrollReveal.svelte';

export {
  Root,
  type StickyScrollRevealProps,
  StickyScrollRevealPropsSchema,
  //
  Root as StickyScrollReveal,
};
