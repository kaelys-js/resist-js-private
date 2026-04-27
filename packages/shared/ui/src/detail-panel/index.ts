/**
 * Barrel re-export for the detail-panel component — exposes the
 * `DetailPanel` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DetailPanelProps, DetailPanelPropsSchema } from './DetailPanel.svelte';

export {
  Root,
  type DetailPanelProps,
  DetailPanelPropsSchema,
  //
  Root as DetailPanel,
};
