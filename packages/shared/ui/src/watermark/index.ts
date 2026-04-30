/**
 * Barrel re-export for the watermark component — exposes
 * the Watermark Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type WatermarkProps, WatermarkPropsSchema } from './Watermark.svelte';

export {
  Root,
  type WatermarkProps,
  WatermarkPropsSchema,
  //
  Root as Watermark,
};
