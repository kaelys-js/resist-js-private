/**
 * Barrel re-export for the snow-effect component — exposes
 * the SnowEffect Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SnowEffectProps, SnowEffectPropsSchema } from './SnowEffect.svelte';

export {
  Root,
  type SnowEffectProps,
  SnowEffectPropsSchema,
  //
  Root as SnowEffect,
};
