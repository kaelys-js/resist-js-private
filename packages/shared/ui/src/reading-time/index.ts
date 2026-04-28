/**
 * Barrel re-export for the reading-time component — exposes
 * the ReadingTime Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ReadingTimeProps, ReadingTimePropsSchema } from './ReadingTime.svelte';

export {
  Root,
  type ReadingTimeProps,
  ReadingTimePropsSchema,
  //
  Root as ReadingTime,
};
