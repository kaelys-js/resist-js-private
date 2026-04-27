/**
 * Barrel re-export for the affix component — exposes the `Affix`
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type AffixProps, AffixPropsSchema } from './Affix.svelte';

export {
  Root,
  type AffixProps,
  AffixPropsSchema,
  //
  Root as Affix,
};
