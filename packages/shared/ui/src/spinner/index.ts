/**
 * Barrel re-export for the spinner component — exposes the
 * Spinner Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type SpinnerProps, SpinnerPropsSchema } from './Spinner.svelte';

export {
  Root,
  type SpinnerProps,
  SpinnerPropsSchema,
  //
  Root as Spinner,
};
