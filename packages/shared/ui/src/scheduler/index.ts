/**
 * Barrel re-export for the scheduler component — exposes the
 * Scheduler Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SchedulerProps, SchedulerPropsSchema } from './Scheduler.svelte';

export {
  Root,
  type SchedulerProps,
  SchedulerPropsSchema,
  //
  Root as Scheduler,
};
