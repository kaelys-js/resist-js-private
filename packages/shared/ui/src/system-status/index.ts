/**
 * Barrel re-export for the system-status component — exposes
 * the SystemStatus Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SystemStatusProps, SystemStatusPropsSchema } from './SystemStatus.svelte';

export {
  Root,
  type SystemStatusProps,
  SystemStatusPropsSchema,
  //
  Root as SystemStatus,
};
