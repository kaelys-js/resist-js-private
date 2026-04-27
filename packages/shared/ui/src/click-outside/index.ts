/**
 * Barrel re-export for the click-outside component — exposes
 * the `ClickOutside` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ClickOutsideProps, ClickOutsidePropsSchema } from './ClickOutside.svelte';

export {
  Root,
  type ClickOutsideProps,
  ClickOutsidePropsSchema,
  //
  Root as ClickOutside,
};
