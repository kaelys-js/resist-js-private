/**
 * Barrel re-export for the checkbox-card component — exposes
 * the `CheckboxCard` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type CheckboxCardProps, CheckboxCardPropsSchema } from './CheckboxCard.svelte';

export {
  Root,
  type CheckboxCardProps,
  CheckboxCardPropsSchema,
  //
  Root as CheckboxCard,
};
