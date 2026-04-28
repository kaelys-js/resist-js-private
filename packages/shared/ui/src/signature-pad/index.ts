/**
 * Barrel re-export for the signature-pad component — exposes
 * the SignaturePad Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SignaturePadProps, SignaturePadPropsSchema } from './SignaturePad.svelte';

export {
  Root,
  type SignaturePadProps,
  SignaturePadPropsSchema,
  //
  Root as SignaturePad,
};
