/**
 * Barrel re-export for the permission-matrix component —
 * exposes the PermissionMatrix Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PermissionMatrixProps,
  PermissionMatrixPropsSchema,
} from './PermissionMatrix.svelte';

export {
  Root,
  type PermissionMatrixProps,
  PermissionMatrixPropsSchema,
  //
  Root as PermissionMatrix,
};
