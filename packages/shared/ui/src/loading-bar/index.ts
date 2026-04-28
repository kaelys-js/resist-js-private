/**
 * Barrel re-export for the loading-bar component — exposes
 * the LoadingBar Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type LoadingBarProps, LoadingBarPropsSchema } from './LoadingBar.svelte';

export {
  Root,
  type LoadingBarProps,
  LoadingBarPropsSchema,
  //
  Root as LoadingBar,
};
