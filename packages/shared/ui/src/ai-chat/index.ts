/**
 * Barrel re-export for the ai-chat component — exposes the
 * `AiChat` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AiChatProps, AiChatPropsSchema } from './AiChat.svelte';

export {
  Root,
  type AiChatProps,
  AiChatPropsSchema,
  //
  Root as AiChat,
};
