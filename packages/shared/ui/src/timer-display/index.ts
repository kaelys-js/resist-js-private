/**
 * Barrel re-export for the timer-display component — exposes
 * the TimerDisplay Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TimerDisplayProps, TimerDisplayPropsSchema } from './TimerDisplay.svelte';

export {
  Root,
  type TimerDisplayProps,
  TimerDisplayPropsSchema,
  //
  Root as TimerDisplay,
};
