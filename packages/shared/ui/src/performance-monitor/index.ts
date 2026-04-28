/**
 * Barrel re-export for the performance-monitor component —
 * exposes the PerformanceMonitor Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PerformanceMonitorProps,
  PerformanceMonitorPropsSchema,
} from './PerformanceMonitor.svelte';

export {
  Root,
  type PerformanceMonitorProps,
  PerformanceMonitorPropsSchema,
  //
  Root as PerformanceMonitor,
};
