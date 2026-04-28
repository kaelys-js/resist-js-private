/**
 * Barrel re-export for the health-bar component — exposes the
 * HealthBar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HealthBarProps, HealthBarPropsSchema } from './HealthBar.svelte';

export {
  Root,
  type HealthBarProps,
  HealthBarPropsSchema,
  //
  Root as HealthBar,
};
