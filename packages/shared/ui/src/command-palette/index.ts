/**
 * Barrel re-export for the command-palette component — exposes
 * the `CommandPalette` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type CommandPaletteProps, CommandPalettePropsSchema } from './CommandPalette.svelte';

export {
  Root,
  type CommandPaletteProps,
  CommandPalettePropsSchema,
  //
  Root as CommandPalette,
};
