/**
 * Barrel re-export for the level-indicator component —
 * exposes the LevelIndicator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type LevelIndicatorProps, LevelIndicatorPropsSchema } from './LevelIndicator.svelte';

export {
  Root,
  type LevelIndicatorProps,
  LevelIndicatorPropsSchema,
  //
  Root as LevelIndicator,
};
