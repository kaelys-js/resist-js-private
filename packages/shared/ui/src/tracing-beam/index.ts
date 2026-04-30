/**
 * Barrel re-export for the tracing-beam component — exposes
 * the TracingBeam Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TracingBeamProps, TracingBeamPropsSchema } from './TracingBeam.svelte';

export {
  Root,
  type TracingBeamProps,
  TracingBeamPropsSchema,
  //
  Root as TracingBeam,
};
