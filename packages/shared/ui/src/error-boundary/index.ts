/**
 * Barrel re-export for the error-boundary component — exposes
 * the ErrorBoundary Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ErrorBoundaryProps, ErrorBoundaryPropsSchema } from './ErrorBoundary.svelte';

export {
  Root,
  type ErrorBoundaryProps,
  ErrorBoundaryPropsSchema,
  //
  Root as ErrorBoundary,
};
