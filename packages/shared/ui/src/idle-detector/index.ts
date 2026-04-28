/**
 * Barrel re-export for the idle-detector component — exposes
 * the IdleDetector Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type IdleDetectorProps, IdleDetectorPropsSchema } from './IdleDetector.svelte';

export {
  Root,
  type IdleDetectorProps,
  IdleDetectorPropsSchema,
  //
  Root as IdleDetector,
};
