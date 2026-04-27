/**
 * Barrel re-export for the agenda-view component — exposes the
 * `AgendaView` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AgendaViewProps, AgendaViewPropsSchema } from './AgendaView.svelte';

export {
  Root,
  type AgendaViewProps,
  AgendaViewPropsSchema,
  //
  Root as AgendaView,
};
