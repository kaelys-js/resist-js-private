/**
 * Barrel re-export for the in-app-message component — exposes
 * the InAppMessage Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type InAppMessageProps, InAppMessagePropsSchema } from './InAppMessage.svelte';

export {
  Root,
  type InAppMessageProps,
  InAppMessagePropsSchema,
  //
  Root as InAppMessage,
};
