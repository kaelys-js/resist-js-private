/**
 * Barrel re-export for the spoiler component — exposes the
 * Spoiler Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SpoilerProps, SpoilerPropsSchema } from './Spoiler.svelte';

export {
  Root,
  type SpoilerProps,
  SpoilerPropsSchema,
  //
  Root as Spoiler,
};
