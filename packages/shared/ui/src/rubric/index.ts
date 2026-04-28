/**
 * Barrel re-export for the rubric component — exposes the
 * Rubric Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type RubricProps, RubricPropsSchema } from './Rubric.svelte';

export {
  Root,
  type RubricProps,
  RubricPropsSchema,
  //
  Root as Rubric,
};
