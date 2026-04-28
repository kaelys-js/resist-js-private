/**
 * Barrel re-export for the reply-form component — exposes
 * the ReplyForm Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ReplyFormProps, ReplyFormPropsSchema } from './ReplyForm.svelte';

export {
  Root,
  type ReplyFormProps,
  ReplyFormPropsSchema,
  //
  Root as ReplyForm,
};
