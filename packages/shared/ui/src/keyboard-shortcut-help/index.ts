/**
 * Barrel re-export for the keyboard-shortcut-help component —
 * exposes the KeyboardShortcutHelp Svelte component, its
 * props type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type KeyboardShortcutHelpProps,
  KeyboardShortcutHelpPropsSchema,
} from './KeyboardShortcutHelp.svelte';

export {
  Root,
  type KeyboardShortcutHelpProps,
  KeyboardShortcutHelpPropsSchema,
  //
  Root as KeyboardShortcutHelp,
};
