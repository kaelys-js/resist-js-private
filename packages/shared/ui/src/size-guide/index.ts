/**
 * Barrel re-export for the size-guide component — exposes
 * the SizeGuide Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SizeGuideProps, SizeGuidePropsSchema } from './SizeGuide.svelte';

export {
  Root,
  type SizeGuideProps,
  SizeGuidePropsSchema,
  //
  Root as SizeGuide,
};
