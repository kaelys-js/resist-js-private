/**
 * Barrel re-export for the lightbox component — exposes the
 * Lightbox Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LightboxProps, LightboxPropsSchema } from './Lightbox.svelte';

export {
  Root,
  type LightboxProps,
  LightboxPropsSchema,
  //
  Root as Lightbox,
};
