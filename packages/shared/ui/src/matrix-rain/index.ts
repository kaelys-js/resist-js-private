/**
 * Barrel re-export for the matrix-rain component — exposes
 * the MatrixRain Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type MatrixRainProps, MatrixRainPropsSchema } from './MatrixRain.svelte';

export {
  Root,
  type MatrixRainProps,
  MatrixRainPropsSchema,
  //
  Root as MatrixRain,
};
