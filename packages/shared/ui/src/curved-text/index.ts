/**
 * Barrel re-export for the curved-text component — exposes the
 * `CurvedText` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CurvedTextProps, CurvedTextPropsSchema } from './CurvedText.svelte';

export {
  Root,
  type CurvedTextProps,
  CurvedTextPropsSchema,
  //
  Root as CurvedText,
};
