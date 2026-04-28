/**
 * Barrel re-export for the mana-bar component — exposes the
 * ManaBar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ManaBarProps, ManaBarPropsSchema } from './ManaBar.svelte';

export {
  Root,
  type ManaBarProps,
  ManaBarPropsSchema,
  //
  Root as ManaBar,
};
