/**
 * Barrel re-export for the background-boxes component — exposes
 * the `BackgroundBoxes` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BackgroundBoxesProps,
  BackgroundBoxesPropsSchema,
} from './BackgroundBoxes.svelte';

export {
  Root,
  type BackgroundBoxesProps,
  BackgroundBoxesPropsSchema,
  //
  Root as BackgroundBoxes,
};
