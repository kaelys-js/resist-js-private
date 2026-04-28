/**
 * Barrel re-export for the status-bar component — exposes
 * the StatusBar Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StatusBarProps, StatusBarPropsSchema } from './StatusBar.svelte';

export {
  Root,
  type StatusBarProps,
  StatusBarPropsSchema,
  //
  Root as StatusBar,
};
