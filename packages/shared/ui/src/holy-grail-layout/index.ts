/**
 * Barrel re-export for the holy-grail-layout component —
 * exposes the HolyGrailLayout Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type HolyGrailLayoutProps,
  HolyGrailLayoutPropsSchema,
} from './HolyGrailLayout.svelte';

export {
  Root,
  type HolyGrailLayoutProps,
  HolyGrailLayoutPropsSchema,
  //
  Root as HolyGrailLayout,
};
