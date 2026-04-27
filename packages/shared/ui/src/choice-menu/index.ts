/**
 * Barrel re-export for the choice-menu component — exposes the
 * `ChoiceMenu` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ChoiceMenuProps, ChoiceMenuPropsSchema } from './ChoiceMenu.svelte';

export {
  Root,
  type ChoiceMenuProps,
  ChoiceMenuPropsSchema,
  //
  Root as ChoiceMenu,
};
