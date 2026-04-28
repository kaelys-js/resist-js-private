/**
 * Barrel re-export for the magic-link component — exposes the
 * MagicLink Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MagicLinkProps, MagicLinkPropsSchema } from './MagicLink.svelte';

export {
  Root,
  type MagicLinkProps,
  MagicLinkPropsSchema,
  //
  Root as MagicLink,
};
