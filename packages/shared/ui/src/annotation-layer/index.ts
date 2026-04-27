/**
 * Barrel re-export for the annotation-layer component — exposes
 * the `AnnotationLayer` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AnnotationLayerProps,
  AnnotationLayerPropsSchema,
} from './AnnotationLayer.svelte';

export {
  Root,
  type AnnotationLayerProps,
  AnnotationLayerPropsSchema,
  //
  Root as AnnotationLayer,
};
