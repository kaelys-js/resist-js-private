/**
 * Barrel re-export for the segmented-control component —
 * exposes the SegmentedControl Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SegmentedControlProps,
  SegmentedControlPropsSchema,
} from './SegmentedControl.svelte';

export {
  Root,
  type SegmentedControlProps,
  SegmentedControlPropsSchema,
  //
  Root as SegmentedControl,
};
