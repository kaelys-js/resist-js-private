/**
 * Barrel re-export for the auto-layout component — exposes the
 * `AutoLayout` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AutoLayoutProps, AutoLayoutPropsSchema } from './AutoLayout.svelte';

export {
  Root,
  type AutoLayoutProps,
  AutoLayoutPropsSchema,
  //
  Root as AutoLayout,
};
