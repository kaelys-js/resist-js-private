/**
 * Barrel re-export for the aurora-text component — exposes the
 * `AuroraText` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AuroraTextProps, AuroraTextPropsSchema } from './AuroraText.svelte';

export {
  Root,
  type AuroraTextProps,
  AuroraTextPropsSchema,
  //
  Root as AuroraText,
};
