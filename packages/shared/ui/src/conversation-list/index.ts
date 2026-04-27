/**
 * Barrel re-export for the conversation-list component — exposes
 * the `ConversationList` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ConversationListProps,
  ConversationListPropsSchema,
} from './ConversationList.svelte';

export {
  Root,
  type ConversationListProps,
  ConversationListPropsSchema,
  //
  Root as ConversationList,
};
