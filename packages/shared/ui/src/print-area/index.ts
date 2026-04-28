/**
 * Barrel re-export for the print-area component — exposes
 * the PrintArea Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PrintAreaProps, PrintAreaPropsSchema } from './PrintArea.svelte';

export {
  Root,
  type PrintAreaProps,
  PrintAreaPropsSchema,
  //
  Root as PrintArea,
};
