/**
 * Barrel re-export for the scroll-wheel-picker component —
 * exposes the ScrollWheelPicker Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ScrollWheelPickerProps,
  ScrollWheelPickerPropsSchema,
} from './ScrollWheelPicker.svelte';

export {
  Root,
  type ScrollWheelPickerProps,
  ScrollWheelPickerPropsSchema,
  //
  Root as ScrollWheelPicker,
};
