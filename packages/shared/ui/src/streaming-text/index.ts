/**
 * Barrel re-export for the streaming-text component —
 * exposes the StreamingText Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type StreamingTextProps, StreamingTextPropsSchema } from './StreamingText.svelte';

export {
  Root,
  type StreamingTextProps,
  StreamingTextPropsSchema,
  //
  Root as StreamingText,
};
