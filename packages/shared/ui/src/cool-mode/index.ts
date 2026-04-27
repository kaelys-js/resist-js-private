/**
 * Barrel re-export for the cool-mode component — exposes the
 * `CoolMode` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CoolModeProps, CoolModePropsSchema } from './CoolMode.svelte';

export {
  Root,
  type CoolModeProps,
  CoolModePropsSchema,
  //
  Root as CoolMode,
};
