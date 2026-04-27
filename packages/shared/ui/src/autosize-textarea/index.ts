/**
 * Barrel re-export for the autosize-textarea component — exposes
 * the `AutosizeTextarea` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AutosizeTextareaProps,
  AutosizeTextareaPropsSchema,
} from './AutosizeTextarea.svelte';

export {
  Root,
  type AutosizeTextareaProps,
  AutosizeTextareaPropsSchema,
  //
  Root as AutosizeTextarea,
};
