/**
 * Barrel re-export for the terminal component — exposes the
 * Terminal Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TerminalProps, TerminalPropsSchema } from './Terminal.svelte';

export {
  Root,
  type TerminalProps,
  TerminalPropsSchema,
  //
  Root as Terminal,
};
