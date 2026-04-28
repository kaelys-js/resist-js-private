/**
 * Barrel re-export for the spinning-text component — exposes
 * the SpinningText Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type SpinningTextProps, SpinningTextPropsSchema } from './SpinningText.svelte';

export {
  Root,
  type SpinningTextProps,
  SpinningTextPropsSchema,
  //
  Root as SpinningText,
};
