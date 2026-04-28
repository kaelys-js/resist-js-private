/**
 * Barrel re-export for the link component — exposes the Link
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type LinkProps, LinkPropsSchema } from './Link.svelte';

export {
  Root,
  type LinkProps,
  LinkPropsSchema,
  //
  Root as Link,
};
