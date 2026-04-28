/**
 * Barrel re-export for the hero-highlight component — exposes
 * the HeroHighlight Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type HeroHighlightProps, HeroHighlightPropsSchema } from './HeroHighlight.svelte';

export {
  Root,
  type HeroHighlightProps,
  HeroHighlightPropsSchema,
  //
  Root as HeroHighlight,
};
