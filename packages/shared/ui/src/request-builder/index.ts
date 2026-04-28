/**
 * Barrel re-export for the request-builder component —
 * exposes the RequestBuilder Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type RequestBuilderProps, RequestBuilderPropsSchema } from './RequestBuilder.svelte';

export {
  Root,
  type RequestBuilderProps,
  RequestBuilderPropsSchema,
  //
  Root as RequestBuilder,
};
