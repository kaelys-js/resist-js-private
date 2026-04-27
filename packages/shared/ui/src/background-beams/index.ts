/**
 * Barrel re-export for the background-beams component — exposes
 * the `BackgroundBeams` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BackgroundBeamsProps,
  BackgroundBeamsPropsSchema,
} from './BackgroundBeams.svelte';

export {
  Root,
  type BackgroundBeamsProps,
  BackgroundBeamsPropsSchema,
  //
  Root as BackgroundBeams,
};
