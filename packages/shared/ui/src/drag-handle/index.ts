/**
 * Barrel re-export for the drag-handle component — exposes the
 * `DragHandle` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DragHandleProps, DragHandlePropsSchema } from './DragHandle.svelte';

export {
  Root,
  type DragHandleProps,
  DragHandlePropsSchema,
  //
  Root as DragHandle,
};
