/**
 * Barrel re-export for the api-playground component — exposes
 * the `ApiPlayground` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type ApiPlaygroundProps, ApiPlaygroundPropsSchema } from './ApiPlayground.svelte';

export {
  Root,
  type ApiPlaygroundProps,
  ApiPlaygroundPropsSchema,
  //
  Root as ApiPlayground,
};
