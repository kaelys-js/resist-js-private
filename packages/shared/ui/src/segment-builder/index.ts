/**
 * Barrel re-export for the segment-builder component —
 * exposes the SegmentBuilder Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SegmentBuilderProps, SegmentBuilderPropsSchema } from './SegmentBuilder.svelte';

export {
  Root,
  type SegmentBuilderProps,
  SegmentBuilderPropsSchema,
  //
  Root as SegmentBuilder,
};
