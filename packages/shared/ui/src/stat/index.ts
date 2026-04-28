/**
 * Barrel re-export for the stat component — exposes the Stat
 * Svelte component, its props type, and the props schema
 * under stable public names.
 *
 * @module
 */

import Root, { type StatProps, StatPropsSchema } from './Stat.svelte';

export {
  Root,
  type StatProps,
  StatPropsSchema,
  //
  Root as Stat,
};
