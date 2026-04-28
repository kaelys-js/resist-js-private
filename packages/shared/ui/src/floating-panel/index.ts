/**
 * Barrel re-export for the floating-panel component — exposes
 * the FloatingPanel Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FloatingPanelProps, FloatingPanelPropsSchema } from './FloatingPanel.svelte';

export {
  Root,
  type FloatingPanelProps,
  FloatingPanelPropsSchema,
  //
  Root as FloatingPanel,
};
