/**
 * Barrel re-export for the poll component — exposes the
 * Poll Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PollProps, PollPropsSchema } from './Poll.svelte';

export {
  Root,
  type PollProps,
  PollPropsSchema,
  //
  Root as Poll,
};
