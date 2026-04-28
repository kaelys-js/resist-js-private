/**
 * Barrel re-export for the knob component — exposes the
 * Knob Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type KnobProps, KnobPropsSchema } from './Knob.svelte';

export {
  Root,
  type KnobProps,
  KnobPropsSchema,
  //
  Root as Knob,
};
