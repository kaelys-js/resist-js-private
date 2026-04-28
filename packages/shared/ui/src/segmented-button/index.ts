/**
 * Barrel re-export for the segmented-button component —
 * exposes the SegmentedButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SegmentedButtonProps,
  SegmentedButtonPropsSchema,
} from './SegmentedButton.svelte';

export {
  Root,
  type SegmentedButtonProps,
  SegmentedButtonPropsSchema,
  //
  Root as SegmentedButton,
};
