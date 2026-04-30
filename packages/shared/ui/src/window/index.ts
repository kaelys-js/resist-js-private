/**
 * Barrel re-export for the window component — exposes the
 * Window Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type WindowProps, WindowPropsSchema } from './Window.svelte';

export {
  Root,
  type WindowProps,
  WindowPropsSchema,
  //
  Root as Window,
};
