/**
 * Barrel re-export for the review-summary component —
 * exposes the ReviewSummary Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type ReviewSummaryProps, ReviewSummaryPropsSchema } from './ReviewSummary.svelte';

export {
  Root,
  type ReviewSummaryProps,
  ReviewSummaryPropsSchema,
  //
  Root as ReviewSummary,
};
