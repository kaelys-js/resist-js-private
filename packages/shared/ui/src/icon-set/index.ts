/**
 * Barrel re-export for the icon-set component — exposes the
 * IconSet Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type IconSetProps, IconSetPropsSchema } from './IconSet.svelte';

export {
  Root,
  type IconSetProps,
  IconSetPropsSchema,
  //
  Root as IconSet,
};
