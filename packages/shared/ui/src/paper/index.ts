/**
 * Barrel re-export for the paper component — exposes the
 * Paper Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PaperProps, PaperPropsSchema } from './Paper.svelte';

export {
  Root,
  type PaperProps,
  PaperPropsSchema,
  //
  Root as Paper,
};
