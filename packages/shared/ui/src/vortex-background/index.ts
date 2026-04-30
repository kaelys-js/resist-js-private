/**
 * Barrel re-export for the vortex-background component —
 * exposes the VortexBackground Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type VortexBackgroundProps,
  VortexBackgroundPropsSchema,
} from './VortexBackground.svelte';

export {
  Root,
  type VortexBackgroundProps,
  VortexBackgroundPropsSchema,
  //
  Root as VortexBackground,
};
