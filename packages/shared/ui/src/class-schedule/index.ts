/**
 * Barrel re-export for the class-schedule component — exposes
 * the `ClassSchedule` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ClassScheduleProps, ClassSchedulePropsSchema } from './ClassSchedule.svelte';

export {
  Root,
  type ClassScheduleProps,
  ClassSchedulePropsSchema,
  //
  Root as ClassSchedule,
};
