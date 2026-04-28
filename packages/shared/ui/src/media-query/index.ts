/**
 * Barrel re-export for the media-query component — exposes
 * the MediaQuery Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MediaQueryProps, MediaQueryPropsSchema } from './MediaQuery.svelte';

export {
  Root,
  type MediaQueryProps,
  MediaQueryPropsSchema,
  //
  Root as MediaQuery,
};
