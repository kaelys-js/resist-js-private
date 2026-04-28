/**
 * Barrel re-export for the stats-counter component — exposes
 * the StatsCounter Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StatsCounterProps, StatsCounterPropsSchema } from './StatsCounter.svelte';

export {
  Root,
  type StatsCounterProps,
  StatsCounterPropsSchema,
  //
  Root as StatsCounter,
};
