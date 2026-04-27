/**
 * Barrel re-export for the ci-cd-pipeline component — exposes
 * the `CiCdPipeline` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CiCdPipelineProps, CiCdPipelinePropsSchema } from './CiCdPipeline.svelte';

export {
  Root,
  type CiCdPipelineProps,
  CiCdPipelinePropsSchema,
  //
  Root as CiCdPipeline,
};
