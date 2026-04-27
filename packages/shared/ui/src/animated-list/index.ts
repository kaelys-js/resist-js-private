/**
 * Barrel re-export for the animated-list component — exposes the
 * `AnimatedList` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AnimatedListProps, AnimatedListPropsSchema } from './AnimatedList.svelte';

export {
  Root,
  type AnimatedListProps,
  AnimatedListPropsSchema,
  //
  Root as AnimatedList,
};
