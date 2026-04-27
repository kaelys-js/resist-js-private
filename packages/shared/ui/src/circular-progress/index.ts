/**
 * Barrel re-export for the circular-progress component — exposes
 * the `CircularProgress` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type CircularProgressProps,
  CircularProgressPropsSchema,
} from './CircularProgress.svelte';

export {
  Root,
  type CircularProgressProps,
  CircularProgressPropsSchema,
  //
  Root as CircularProgress,
};
