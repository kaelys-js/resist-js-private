/**
 * Barrel re-export for the phone-input component — exposes
 * the PhoneInput Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PhoneInputProps, PhoneInputPropsSchema } from './PhoneInput.svelte';

export {
  Root,
  type PhoneInputProps,
  PhoneInputPropsSchema,
  //
  Root as PhoneInput,
};
