/**
 * Barrel re-export for the debug-panel component — exposes the
 * `DebugPanel` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DebugPanelProps, DebugPanelPropsSchema } from './DebugPanel.svelte';

export {
  Root,
  type DebugPanelProps,
  DebugPanelPropsSchema,
  //
  Root as DebugPanel,
};
