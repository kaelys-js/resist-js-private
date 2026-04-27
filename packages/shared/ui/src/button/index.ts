/**
 * Barrel re-export for the button component — exposes the
 * `Button` Svelte component, `Props` / `ButtonProps` types,
 * `ButtonVariant` / `ButtonSize` types, and the `buttonVariants`
 * TV helper under stable public names.
 *
 * @module
 */

import Root from './button.svelte';
import { buttonVariants, type ButtonProps, type ButtonSize, type ButtonVariant } from './types.js';

export {
  Root,
  type ButtonProps as Props,
  //
  Root as Button,
  buttonVariants,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
};
