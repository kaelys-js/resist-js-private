/**
 * Barrel re-export for the stateful-button component —
 * exposes the StatefulButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type StatefulButtonProps, StatefulButtonPropsSchema } from './StatefulButton.svelte';

export {
  Root,
  type StatefulButtonProps,
  StatefulButtonPropsSchema,
  //
  Root as StatefulButton,
};
