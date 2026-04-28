/**
 * Barrel re-export for the subscribe-button component —
 * exposes the SubscribeButton Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SubscribeButtonProps,
  SubscribeButtonPropsSchema,
} from './SubscribeButton.svelte';

export {
  Root,
  type SubscribeButtonProps,
  SubscribeButtonPropsSchema,
  //
  Root as SubscribeButton,
};
