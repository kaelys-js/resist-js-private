/**
 * Barrel re-export for the histogram component — exposes the
 * Histogram Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HistogramProps, HistogramPropsSchema } from './Histogram.svelte';

export {
  Root,
  type HistogramProps,
  HistogramPropsSchema,
  //
  Root as Histogram,
};
