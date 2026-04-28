/**
 * Barrel re-export for the multi-step-loader component —
 * exposes the MultiStepLoader Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type MultiStepLoaderProps,
  MultiStepLoaderPropsSchema,
} from './MultiStepLoader.svelte';

export {
  Root,
  type MultiStepLoaderProps,
  MultiStepLoaderPropsSchema,
  //
  Root as MultiStepLoader,
};
