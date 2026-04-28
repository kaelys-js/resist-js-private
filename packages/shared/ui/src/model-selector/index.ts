/**
 * Barrel re-export for the model-selector component — exposes
 * the ModelSelector Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ModelSelectorProps, ModelSelectorPropsSchema } from './ModelSelector.svelte';

export {
  Root,
  type ModelSelectorProps,
  ModelSelectorPropsSchema,
  //
  Root as ModelSelector,
};
