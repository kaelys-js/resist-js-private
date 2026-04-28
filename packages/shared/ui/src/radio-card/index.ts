/**
 * Barrel re-export for the radio-card component — exposes the
 * RadioCard Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type RadioCardProps, RadioCardPropsSchema } from './RadioCard.svelte';

export {
  Root,
  type RadioCardProps,
  RadioCardPropsSchema,
  //
  Root as RadioCard,
};
