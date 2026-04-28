/**
 * Barrel re-export for the magnetic-button component —
 * exposes the MagneticButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type MagneticButtonProps, MagneticButtonPropsSchema } from './MagneticButton.svelte';

export {
  Root,
  type MagneticButtonProps,
  MagneticButtonPropsSchema,
  //
  Root as MagneticButton,
};
