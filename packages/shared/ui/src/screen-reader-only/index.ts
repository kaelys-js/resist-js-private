/**
 * Barrel re-export for the screen-reader-only component —
 * exposes the ScreenReaderOnly Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ScreenReaderOnlyProps,
  ScreenReaderOnlyPropsSchema,
} from './ScreenReaderOnly.svelte';

export {
  Root,
  type ScreenReaderOnlyProps,
  ScreenReaderOnlyPropsSchema,
  //
  Root as ScreenReaderOnly,
};
