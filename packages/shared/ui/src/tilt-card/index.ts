/**
 * Barrel re-export for the tilt-card component — exposes the
 * TiltCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TiltCardProps, TiltCardPropsSchema } from './TiltCard.svelte';

export {
  Root,
  type TiltCardProps,
  TiltCardPropsSchema,
  //
  Root as TiltCard,
};
