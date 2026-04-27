/**
 * Barrel re-export for the browser-frame component — exposes the
 * `BrowserFrame` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type BrowserFrameProps, BrowserFramePropsSchema } from './BrowserFrame.svelte';

export {
  Root,
  type BrowserFrameProps,
  BrowserFramePropsSchema,
  //
  Root as BrowserFrame,
};
