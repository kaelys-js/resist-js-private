/**
 * Barrel re-export for the dot-pattern component — exposes the
 * `DotPattern` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DotPatternProps, DotPatternPropsSchema } from './DotPattern.svelte';

export {
  Root,
  type DotPatternProps,
  DotPatternPropsSchema,
  //
  Root as DotPattern,
};
