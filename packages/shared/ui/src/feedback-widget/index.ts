/**
 * Barrel re-export for the feedback-widget component — exposes
 * the FeedbackWidget Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type FeedbackWidgetProps, FeedbackWidgetPropsSchema } from './FeedbackWidget.svelte';

export {
  Root,
  type FeedbackWidgetProps,
  FeedbackWidgetPropsSchema,
  //
  Root as FeedbackWidget,
};
