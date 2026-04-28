/**
 * Barrel re-export for the icon-browser component — exposes
 * the IconBrowser Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type IconBrowserProps, IconBrowserPropsSchema } from './IconBrowser.svelte';

export {
  Root,
  type IconBrowserProps,
  IconBrowserPropsSchema,
  //
  Root as IconBrowser,
};
