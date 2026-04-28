/**
 * Barrel re-export for the input-validator component —
 * exposes the InputValidator Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type InputValidatorProps, InputValidatorPropsSchema } from './InputValidator.svelte';

export {
  Root,
  type InputValidatorProps,
  InputValidatorPropsSchema,
  //
  Root as InputValidator,
};
