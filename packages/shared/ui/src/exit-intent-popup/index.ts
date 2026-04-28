/**
 * Barrel re-export for the exit-intent-popup component —
 * exposes the ExitIntentPopup Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ExitIntentPopupProps,
  ExitIntentPopupPropsSchema,
} from './ExitIntentPopup.svelte';

export {
  Root,
  type ExitIntentPopupProps,
  ExitIntentPopupPropsSchema,
  //
  Root as ExitIntentPopup,
};
