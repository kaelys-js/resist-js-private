/**
 * Barrel re-export for the panel component — exposes the
 * Panel Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PanelProps, PanelPropsSchema } from './Panel.svelte';

export {
  Root,
  type PanelProps,
  PanelPropsSchema,
  //
  Root as Panel,
};
