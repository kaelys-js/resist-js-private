/**
 * Barrel re-export for the stream-graph component — exposes
 * the StreamGraph Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StreamGraphProps, StreamGraphPropsSchema } from './StreamGraph.svelte';

export {
  Root,
  type StreamGraphProps,
  StreamGraphPropsSchema,
  //
  Root as StreamGraph,
};
