/**
 * Barrel re-export for the confetti component — exposes the
 * `Confetti` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type ConfettiProps, ConfettiPropsSchema } from './Confetti.svelte';

export {
  Root,
  type ConfettiProps,
  ConfettiPropsSchema,
  //
  Root as Confetti,
};
