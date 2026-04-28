/**
 * Barrel re-export for the mention component — exposes the
 * Mention Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MentionProps, MentionPropsSchema } from './Mention.svelte';

export {
  Root,
  type MentionProps,
  MentionPropsSchema,
  //
  Root as Mention,
};
