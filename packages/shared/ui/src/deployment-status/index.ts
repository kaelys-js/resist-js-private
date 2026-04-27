/**
 * Barrel re-export for the deployment-status component — exposes
 * the `DeploymentStatus` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DeploymentStatusProps,
  DeploymentStatusPropsSchema,
} from './DeploymentStatus.svelte';

export {
  Root,
  type DeploymentStatusProps,
  DeploymentStatusPropsSchema,
  //
  Root as DeploymentStatus,
};
