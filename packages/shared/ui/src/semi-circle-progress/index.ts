/**
 * Barrel re-export for the semi-circle-progress component —
 * exposes the SemiCircleProgress Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type SemiCircleProgressProps,
  SemiCircleProgressPropsSchema,
} from './SemiCircleProgress.svelte';

export {
  Root,
  type SemiCircleProgressProps,
  SemiCircleProgressPropsSchema,
  //
  Root as SemiCircleProgress,
};
