/**
 * Barrel re-export for the border-beam component — exposes the
 * `BorderBeam` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BorderBeamProps, BorderBeamPropsSchema } from './BorderBeam.svelte';

export {
  Root,
  type BorderBeamProps,
  BorderBeamPropsSchema,
  //
  Root as BorderBeam,
};
