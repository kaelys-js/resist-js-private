/**
 * Barrel re-export for the noise-background component —
 * exposes the NoiseBackground Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NoiseBackgroundProps,
  NoiseBackgroundPropsSchema,
} from './NoiseBackground.svelte';

export {
  Root,
  type NoiseBackgroundProps,
  NoiseBackgroundPropsSchema,
  //
  Root as NoiseBackground,
};
