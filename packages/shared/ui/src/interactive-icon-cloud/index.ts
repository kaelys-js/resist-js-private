/**
 * Barrel re-export for the interactive-icon-cloud component —
 * exposes the InteractiveIconCloud Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type InteractiveIconCloudProps,
  InteractiveIconCloudPropsSchema,
} from './InteractiveIconCloud.svelte';

export {
  Root,
  type InteractiveIconCloudProps,
  InteractiveIconCloudPropsSchema,
  //
  Root as InteractiveIconCloud,
};
