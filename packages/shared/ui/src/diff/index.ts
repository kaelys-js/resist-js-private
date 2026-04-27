/**
 * Barrel re-export for the diff component — exposes the `Diff`
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type DiffProps, DiffPropsSchema } from './Diff.svelte';

export {
  Root,
  type DiffProps,
  DiffPropsSchema,
  //
  Root as Diff,
};
