/**
 * Barrel re-export for the build-status component — exposes the
 * `BuildStatus` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BuildStatusProps, BuildStatusPropsSchema } from './BuildStatus.svelte';

export {
  Root,
  type BuildStatusProps,
  BuildStatusPropsSchema,
  //
  Root as BuildStatus,
};
