/**
 * Barrel re-export for the long-press component — exposes the
 * LongPress Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type LongPressProps, LongPressPropsSchema } from './LongPress.svelte';

export {
  Root,
  type LongPressProps,
  LongPressPropsSchema,
  //
  Root as LongPress,
};
