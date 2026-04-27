/**
 * Barrel re-export for the blob-animation component — exposes
 * the `BlobAnimation` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BlobAnimationProps, BlobAnimationPropsSchema } from './BlobAnimation.svelte';

export {
  Root,
  type BlobAnimationProps,
  BlobAnimationPropsSchema,
  //
  Root as BlobAnimation,
};
