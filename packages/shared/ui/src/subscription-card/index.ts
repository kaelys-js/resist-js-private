/**
 * Barrel re-export for the subscription-card component —
 * exposes the SubscriptionCard Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SubscriptionCardProps,
  SubscriptionCardPropsSchema,
} from './SubscriptionCard.svelte';

export {
  Root,
  type SubscriptionCardProps,
  SubscriptionCardPropsSchema,
  //
  Root as SubscriptionCard,
};
