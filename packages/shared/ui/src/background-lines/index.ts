/**
 * Barrel re-export for the background-lines component — exposes
 * the `BackgroundLines` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type BackgroundLinesProps,
  BackgroundLinesPropsSchema,
} from './BackgroundLines.svelte';

export {
  Root,
  type BackgroundLinesProps,
  BackgroundLinesPropsSchema,
  //
  Root as BackgroundLines,
};
