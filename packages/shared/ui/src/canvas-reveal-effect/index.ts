/**
 * Barrel re-export for the canvas-reveal-effect component —
 * exposes the `CanvasRevealEffect` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type CanvasRevealEffectProps,
  CanvasRevealEffectPropsSchema,
} from './CanvasRevealEffect.svelte';

export {
  Root,
  type CanvasRevealEffectProps,
  CanvasRevealEffectPropsSchema,
  //
  Root as CanvasRevealEffect,
};
