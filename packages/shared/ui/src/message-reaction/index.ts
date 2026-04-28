/**
 * Barrel re-export for the message-reaction component —
 * exposes the MessageReaction Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type MessageReactionProps,
  MessageReactionPropsSchema,
} from './MessageReaction.svelte';

export {
  Root,
  type MessageReactionProps,
  MessageReactionPropsSchema,
  //
  Root as MessageReaction,
};
