/**
 * Barrel re-export for the typography component — exposes
 * the Typography Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TypographyProps, TypographyPropsSchema } from './Typography.svelte';

export {
  Root,
  type TypographyProps,
  TypographyPropsSchema,
  //
  Root as Typography,
};
