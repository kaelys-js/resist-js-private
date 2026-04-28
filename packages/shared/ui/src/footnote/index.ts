/**
 * Barrel re-export for the footnote component — exposes the
 * Footnote Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type FootnoteProps, FootnotePropsSchema } from './Footnote.svelte';

export {
  Root,
  type FootnoteProps,
  FootnotePropsSchema,
  //
  Root as Footnote,
};
