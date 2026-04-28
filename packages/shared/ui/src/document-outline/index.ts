/**
 * Barrel re-export for the document-outline component — exposes
 * the `DocumentOutline` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type DocumentOutlineProps,
  DocumentOutlinePropsSchema,
} from './DocumentOutline.svelte';

export {
  Root,
  type DocumentOutlineProps,
  DocumentOutlinePropsSchema,
  //
  Root as DocumentOutline,
};
