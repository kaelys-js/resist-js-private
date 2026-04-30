/**
 * Barrel re-export for the url-input component — exposes
 * the UrlInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type UrlInputProps, UrlInputPropsSchema } from './UrlInput.svelte';

export {
  Root,
  type UrlInputProps,
  UrlInputPropsSchema,
  //
  Root as UrlInput,
};
