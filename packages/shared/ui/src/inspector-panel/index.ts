/**
 * Barrel re-export for the inspector-panel component —
 * exposes the InspectorPanel Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type InspectorPanelProps, InspectorPanelPropsSchema } from './InspectorPanel.svelte';

export {
  Root,
  type InspectorPanelProps,
  InspectorPanelPropsSchema,
  //
  Root as InspectorPanel,
};
