/**
 * Barrel re-export for the result-page component — exposes
 * the ResultPage Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ResultPageProps, ResultPagePropsSchema } from './ResultPage.svelte';

export {
  Root,
  type ResultPageProps,
  ResultPagePropsSchema,
  //
  Root as ResultPage,
};
