/**
 * Barrel re-export for the code component — exposes the `Code`
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type CodeProps, CodePropsSchema } from './Code.svelte';

export {
  Root,
  type CodeProps,
  CodePropsSchema,
  //
  Root as Code,
};
