/**
 * Barrel re-export for the particles-bg component — exposes
 * the ParticlesBg Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ParticlesBgProps, ParticlesBgPropsSchema } from './ParticlesBg.svelte';

export {
  Root,
  type ParticlesBgProps,
  ParticlesBgPropsSchema,
  //
  Root as ParticlesBg,
};
