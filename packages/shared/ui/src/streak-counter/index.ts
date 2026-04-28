/**
 * Barrel re-export for the streak-counter component —
 * exposes the StreakCounter Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type StreakCounterProps, StreakCounterPropsSchema } from './StreakCounter.svelte';

export {
  Root,
  type StreakCounterProps,
  StreakCounterPropsSchema,
  //
  Root as StreakCounter,
};
