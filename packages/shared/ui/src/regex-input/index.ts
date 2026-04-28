/**
 * Barrel re-export for the regex-input component — exposes
 * the RegexInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RegexInputProps, RegexInputPropsSchema } from './RegexInput.svelte';

export {
  Root,
  type RegexInputProps,
  RegexInputPropsSchema,
  //
  Root as RegexInput,
};
