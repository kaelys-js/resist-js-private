/**
 * Barrel re-export for the meteor-effect component — exposes
 * the MeteorEffect Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MeteorEffectProps, MeteorEffectPropsSchema } from './MeteorEffect.svelte';

export {
  Root,
  type MeteorEffectProps,
  MeteorEffectPropsSchema,
  //
  Root as MeteorEffect,
};
