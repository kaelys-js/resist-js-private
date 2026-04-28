/**
 * Barrel re-export for the hero component — exposes the Hero
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type HeroProps, HeroPropsSchema } from './Hero.svelte';

export {
  Root,
  type HeroProps,
  HeroPropsSchema,
  //
  Root as Hero,
};
