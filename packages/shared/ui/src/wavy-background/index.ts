/**
 * Barrel re-export for the wavy-background component —
 * exposes the WavyBackground Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type WavyBackgroundProps, WavyBackgroundPropsSchema } from './WavyBackground.svelte';

export {
  Root,
  type WavyBackgroundProps,
  WavyBackgroundPropsSchema,
  //
  Root as WavyBackground,
};
