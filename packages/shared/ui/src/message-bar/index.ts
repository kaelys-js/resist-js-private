/**
 * Barrel re-export for the message-bar component — exposes
 * the MessageBar Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MessageBarProps, MessageBarPropsSchema } from './MessageBar.svelte';

export {
  Root,
  type MessageBarProps,
  MessageBarPropsSchema,
  //
  Root as MessageBar,
};
