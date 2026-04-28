/**
 * Barrel re-export for the speed-dial component — exposes
 * the SpeedDial Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SpeedDialProps, SpeedDialPropsSchema } from './SpeedDial.svelte';

export {
  Root,
  type SpeedDialProps,
  SpeedDialPropsSchema,
  //
  Root as SpeedDial,
};
