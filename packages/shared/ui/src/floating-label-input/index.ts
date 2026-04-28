/**
 * Barrel re-export for the floating-label-input component —
 * exposes the FloatingLabelInput Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type FloatingLabelInputProps,
  FloatingLabelInputPropsSchema,
} from './FloatingLabelInput.svelte';

export {
  Root,
  type FloatingLabelInputProps,
  FloatingLabelInputPropsSchema,
  //
  Root as FloatingLabelInput,
};
