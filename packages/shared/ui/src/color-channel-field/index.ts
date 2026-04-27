/**
 * Barrel re-export for the color-channel-field component —
 * exposes the `ColorChannelField` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ColorChannelFieldProps,
  ColorChannelFieldPropsSchema,
} from './ColorChannelField.svelte';

export {
  Root,
  type ColorChannelFieldProps,
  ColorChannelFieldPropsSchema,
  //
  Root as ColorChannelField,
};
