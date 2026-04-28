/**
 * Barrel re-export for the info-panel component — exposes the
 * InfoPanel Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type InfoPanelProps, InfoPanelPropsSchema } from './InfoPanel.svelte';

export {
  Root,
  type InfoPanelProps,
  InfoPanelPropsSchema,
  //
  Root as InfoPanel,
};
