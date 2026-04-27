/**
 * Barrel re-export for the clipboard component — exposes the
 * `Clipboard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ClipboardProps, ClipboardPropsSchema } from './Clipboard.svelte';

export {
  Root,
  type ClipboardProps,
  ClipboardPropsSchema,
  //
  Root as Clipboard,
};
