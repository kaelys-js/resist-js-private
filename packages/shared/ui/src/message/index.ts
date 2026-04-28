/**
 * Barrel re-export for the message component — exposes the
 * Message Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MessageProps, MessagePropsSchema } from './Message.svelte';

export {
  Root,
  type MessageProps,
  MessagePropsSchema,
  //
  Root as Message,
};
