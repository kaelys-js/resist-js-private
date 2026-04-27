/**
 * Barrel re-export for the bundle-analyzer component — exposes
 * the `BundleAnalyzer` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type BundleAnalyzerProps, BundleAnalyzerPropsSchema } from './BundleAnalyzer.svelte';

export {
  Root,
  type BundleAnalyzerProps,
  BundleAnalyzerPropsSchema,
  //
  Root as BundleAnalyzer,
};
