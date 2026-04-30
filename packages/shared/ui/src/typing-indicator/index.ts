/**
 * Barrel re-export for the typing-indicator component —
 * exposes the TypingIndicator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TypingIndicatorProps,
  TypingIndicatorPropsSchema,
} from './TypingIndicator.svelte';

export {
  Root,
  type TypingIndicatorProps,
  TypingIndicatorPropsSchema,
  //
  Root as TypingIndicator,
};
