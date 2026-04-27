/**
 * Barrel re-export for the blockquote component — exposes the
 * `Blockquote` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BlockquoteProps, BlockquotePropsSchema } from './Blockquote.svelte';

export {
  Root,
  type BlockquoteProps,
  BlockquotePropsSchema,
  //
  Root as Blockquote,
};
