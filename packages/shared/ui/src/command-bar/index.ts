/**
 * Barrel re-export for the command-bar component — exposes the
 * `CommandBar` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CommandBarProps, CommandBarPropsSchema } from './CommandBar.svelte';

export {
  Root,
  type CommandBarProps,
  CommandBarPropsSchema,
  //
  Root as CommandBar,
};
