/**
 * Barrel re-export for the hero-section component — exposes
 * the HeroSection Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type HeroSectionProps, HeroSectionPropsSchema } from './HeroSection.svelte';

export {
  Root,
  type HeroSectionProps,
  HeroSectionPropsSchema,
  //
  Root as HeroSection,
};
