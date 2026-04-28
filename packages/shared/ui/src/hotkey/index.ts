/**
 * Barrel re-export for the hotkey component — exposes the
 * Hotkey Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type HotkeyProps, HotkeyPropsSchema } from './Hotkey.svelte';

export {
  Root,
  type HotkeyProps,
  HotkeyPropsSchema,
  //
  Root as Hotkey,
};
