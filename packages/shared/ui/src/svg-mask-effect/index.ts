/**
 * Barrel re-export for the svg-mask-effect component —
 * exposes the SvgMaskEffect Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SvgMaskEffectProps, SvgMaskEffectPropsSchema } from './SvgMaskEffect.svelte';

export {
  Root,
  type SvgMaskEffectProps,
  SvgMaskEffectPropsSchema,
  //
  Root as SvgMaskEffect,
};
