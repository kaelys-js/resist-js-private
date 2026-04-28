/**
 * Barrel re-export for the particle-trail component —
 * exposes the ParticleTrail Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ParticleTrailProps, ParticleTrailPropsSchema } from './ParticleTrail.svelte';

export {
  Root,
  type ParticleTrailProps,
  ParticleTrailPropsSchema,
  //
  Root as ParticleTrail,
};
