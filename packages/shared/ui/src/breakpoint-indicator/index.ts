/**
 * Barrel re-export for the breakpoint-indicator component —
 * exposes the `BreakpointIndicator` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BreakpointIndicatorProps,
  BreakpointIndicatorPropsSchema,
} from './BreakpointIndicator.svelte';

export {
  Root,
  type BreakpointIndicatorProps,
  BreakpointIndicatorPropsSchema,
  //
  Root as BreakpointIndicator,
};
