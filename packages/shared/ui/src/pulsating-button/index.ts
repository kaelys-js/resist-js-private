/**
 * Barrel re-export for the pulsating-button component —
 * exposes the PulsatingButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type PulsatingButtonProps,
  PulsatingButtonPropsSchema,
} from './PulsatingButton.svelte';

export {
  Root,
  type PulsatingButtonProps,
  PulsatingButtonPropsSchema,
  //
  Root as PulsatingButton,
};
