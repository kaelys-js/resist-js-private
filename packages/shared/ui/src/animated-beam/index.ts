/**
 * Barrel re-export for the animated-beam component — exposes the
 * `AnimatedBeam` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AnimatedBeamProps, AnimatedBeamPropsSchema } from './AnimatedBeam.svelte';

export {
  Root,
  type AnimatedBeamProps,
  AnimatedBeamPropsSchema,
  //
  Root as AnimatedBeam,
};
