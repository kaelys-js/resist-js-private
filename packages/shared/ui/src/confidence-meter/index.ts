/**
 * Barrel re-export for the confidence-meter component — exposes
 * the `ConfidenceMeter` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ConfidenceMeterProps,
  ConfidenceMeterPropsSchema,
} from './ConfidenceMeter.svelte';

export {
  Root,
  type ConfidenceMeterProps,
  ConfidenceMeterPropsSchema,
  //
  Root as ConfidenceMeter,
};
