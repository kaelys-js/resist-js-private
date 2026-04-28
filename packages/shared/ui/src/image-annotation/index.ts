/**
 * Barrel re-export for the image-annotation component —
 * exposes the ImageAnnotation Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ImageAnnotationProps,
  ImageAnnotationPropsSchema,
} from './ImageAnnotation.svelte';

export {
  Root,
  type ImageAnnotationProps,
  ImageAnnotationPropsSchema,
  //
  Root as ImageAnnotation,
};
