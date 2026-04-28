/**
 * Barrel re-export for the liquid-effect component — exposes
 * the LiquidEffect Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LiquidEffectProps, LiquidEffectPropsSchema } from './LiquidEffect.svelte';

export {
  Root,
  type LiquidEffectProps,
  LiquidEffectPropsSchema,
  //
  Root as LiquidEffect,
};
