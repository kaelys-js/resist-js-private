/**
 * Barrel re-export for the action-sheet component — exposes the
 * `ActionSheet` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ActionSheetProps, ActionSheetPropsSchema } from './ActionSheet.svelte';

export {
  Root,
  type ActionSheetProps,
  ActionSheetPropsSchema,
  //
  Root as ActionSheet,
};
