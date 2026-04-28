/**
 * Barrel re-export for the panel-stack component — exposes
 * the PanelStack Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PanelStackProps, PanelStackPropsSchema } from './PanelStack.svelte';

export {
  Root,
  type PanelStackProps,
  PanelStackPropsSchema,
  //
  Root as PanelStack,
};
