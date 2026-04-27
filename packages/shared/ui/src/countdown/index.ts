/**
 * Barrel re-export for the countdown component — exposes the
 * `Countdown` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CountdownProps, CountdownPropsSchema } from './Countdown.svelte';

export {
  Root,
  type CountdownProps,
  CountdownPropsSchema,
  //
  Root as Countdown,
};
