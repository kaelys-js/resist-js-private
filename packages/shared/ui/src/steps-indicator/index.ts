/**
 * Barrel re-export for the steps-indicator component —
 * exposes the StepsIndicator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type StepsIndicatorProps, StepsIndicatorPropsSchema } from './StepsIndicator.svelte';

export {
  Root,
  type StepsIndicatorProps,
  StepsIndicatorPropsSchema,
  //
  Root as StepsIndicator,
};
