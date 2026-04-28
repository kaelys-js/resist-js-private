/**
 * Barrel re-export for the pin-input component — exposes the
 * PinInput Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PinInputProps, PinInputPropsSchema } from './PinInput.svelte';

export {
  Root,
  type PinInputProps,
  PinInputPropsSchema,
  //
  Root as PinInput,
};
