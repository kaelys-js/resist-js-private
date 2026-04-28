/**
 * Barrel re-export for the drop-zone component — exposes the
 * `DropZone` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DropZoneProps, DropZonePropsSchema } from './DropZone.svelte';

export {
  Root,
  type DropZoneProps,
  DropZonePropsSchema,
  //
  Root as DropZone,
};
