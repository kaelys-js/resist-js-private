/**
 * Barrel re-export for the parallel-coordinates component —
 * exposes the ParallelCoordinates Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ParallelCoordinatesProps,
  ParallelCoordinatesPropsSchema,
} from './ParallelCoordinates.svelte';

export {
  Root,
  type ParallelCoordinatesProps,
  ParallelCoordinatesPropsSchema,
  //
  Root as ParallelCoordinates,
};
