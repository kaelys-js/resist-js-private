/**
 * Barrel re-export for the message-composer component —
 * exposes the MessageComposer Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type MessageComposerProps,
  MessageComposerPropsSchema,
} from './MessageComposer.svelte';

export {
  Root,
  type MessageComposerProps,
  MessageComposerPropsSchema,
  //
  Root as MessageComposer,
};
