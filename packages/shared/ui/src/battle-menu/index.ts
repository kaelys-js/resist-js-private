/**
 * Barrel re-export for the battle-menu component — exposes the
 * `BattleMenu` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BattleMenuProps, BattleMenuPropsSchema } from './BattleMenu.svelte';

export {
  Root,
  type BattleMenuProps,
  BattleMenuPropsSchema,
  //
  Root as BattleMenu,
};
