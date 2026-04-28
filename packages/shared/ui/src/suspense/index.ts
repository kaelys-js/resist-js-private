/**
 * Barrel re-export for the suspense component — exposes the
 * Suspense Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SuspenseProps, SuspensePropsSchema } from './Suspense.svelte';

export {
  Root,
  type SuspenseProps,
  SuspensePropsSchema,
  //
  Root as Suspense,
};
