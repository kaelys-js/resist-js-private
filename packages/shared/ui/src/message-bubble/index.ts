/**
 * Barrel re-export for the message-bubble component — exposes
 * the MessageBubble Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MessageBubbleProps, MessageBubblePropsSchema } from './MessageBubble.svelte';

export {
  Root,
  type MessageBubbleProps,
  MessageBubblePropsSchema,
  //
  Root as MessageBubble,
};
