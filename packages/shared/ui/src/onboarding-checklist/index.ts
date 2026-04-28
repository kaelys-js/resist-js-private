/**
 * Barrel re-export for the onboarding-checklist component —
 * exposes the OnboardingChecklist Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type OnboardingChecklistProps,
  OnboardingChecklistPropsSchema,
} from './OnboardingChecklist.svelte';

export {
  Root,
  type OnboardingChecklistProps,
  OnboardingChecklistPropsSchema,
  //
  Root as OnboardingChecklist,
};
