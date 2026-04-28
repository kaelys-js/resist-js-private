/**
 * Barrel re-export for the portal component — exposes the
 * Portal Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PortalProps, PortalPropsSchema } from './Portal.svelte';

export {
  Root,
  type PortalProps,
  PortalPropsSchema,
  //
  Root as Portal,
};
