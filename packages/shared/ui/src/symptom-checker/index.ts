/**
 * Barrel re-export for the symptom-checker component —
 * exposes the SymptomChecker Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SymptomCheckerProps, SymptomCheckerPropsSchema } from './SymptomChecker.svelte';

export {
  Root,
  type SymptomCheckerProps,
  SymptomCheckerPropsSchema,
  //
  Root as SymptomChecker,
};
