/**
 * Barrel re-export for the splitter-panel component —
 * exposes the SplitterPanel Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SplitterPanelProps, SplitterPanelPropsSchema } from './SplitterPanel.svelte';

export {
  Root,
  type SplitterPanelProps,
  SplitterPanelPropsSchema,
  //
  Root as SplitterPanel,
};
