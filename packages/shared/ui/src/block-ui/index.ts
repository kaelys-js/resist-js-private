/**
 * Barrel re-export for the block-ui component — exposes the
 * `BlockUi` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BlockUiProps, BlockUiPropsSchema } from './BlockUi.svelte';

export {
  Root,
  type BlockUiProps,
  BlockUiPropsSchema,
  //
  Root as BlockUi,
};
