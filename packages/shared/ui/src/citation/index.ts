/**
 * Barrel re-export for the citation component — exposes the
 * `Citation` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CitationProps, CitationPropsSchema } from './Citation.svelte';

export {
  Root,
  type CitationProps,
  CitationPropsSchema,
  //
  Root as Citation,
};
