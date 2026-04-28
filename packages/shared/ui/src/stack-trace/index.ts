/**
 * Barrel re-export for the stack-trace component — exposes
 * the StackTrace Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StackTraceProps, StackTracePropsSchema } from './StackTrace.svelte';

export {
  Root,
  type StackTraceProps,
  StackTracePropsSchema,
  //
  Root as StackTrace,
};
