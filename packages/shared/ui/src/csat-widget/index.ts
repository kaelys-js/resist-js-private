/**
 * Barrel re-export for the csat-widget component — exposes the
 * `CsatWidget` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CsatWidgetProps, CsatWidgetPropsSchema } from './CsatWidget.svelte';

export {
  Root,
  type CsatWidgetProps,
  CsatWidgetPropsSchema,
  //
  Root as CsatWidget,
};
