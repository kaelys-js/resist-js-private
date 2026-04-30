/**
 * Barrel re-export for the visually-hidden component —
 * exposes the VisuallyHidden Svelte component, its props
 * type / schema, and `visuallyHiddenVariants` (tv helper).
 *
 * @module
 */

import Root, {
  type VisuallyHiddenInputProps,
  type VisuallyHiddenProps,
  VisuallyHiddenPropsSchema,
  visuallyHiddenVariants,
} from './VisuallyHidden.svelte';

export {
  Root,
  type VisuallyHiddenInputProps,
  type VisuallyHiddenProps,
  VisuallyHiddenPropsSchema,
  visuallyHiddenVariants,
  //
  Root as VisuallyHidden,
};
