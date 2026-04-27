/**
 * Barrel re-export for the chat-bubble component — exposes the
 * `ChatBubble` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ChatBubbleProps, ChatBubblePropsSchema } from './ChatBubble.svelte';

export {
  Root,
  type ChatBubbleProps,
  ChatBubblePropsSchema,
  //
  Root as ChatBubble,
};
