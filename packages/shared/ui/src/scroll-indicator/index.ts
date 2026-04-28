/**
 * Barrel re-export for the scroll-indicator component —
 * exposes the ScrollIndicator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ScrollIndicatorProps,
  ScrollIndicatorPropsSchema,
} from './ScrollIndicator.svelte';

export {
  Root,
  type ScrollIndicatorProps,
  ScrollIndicatorPropsSchema,
  //
  Root as ScrollIndicator,
};
