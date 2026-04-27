/**
 * Barrel re-export for the barcode component — exposes the
 * `Barcode` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BarcodeProps, BarcodePropsSchema } from './Barcode.svelte';

export {
  Root,
  type BarcodeProps,
  BarcodePropsSchema,
  //
  Root as Barcode,
};
