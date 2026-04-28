/**
 * Barrel re-export for the teaching-popover component —
 * exposes the TeachingPopover Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type TeachingPopoverProps,
  TeachingPopoverPropsSchema,
} from './TeachingPopover.svelte';

export {
  Root,
  type TeachingPopoverProps,
  TeachingPopoverPropsSchema,
  //
  Root as TeachingPopover,
};
