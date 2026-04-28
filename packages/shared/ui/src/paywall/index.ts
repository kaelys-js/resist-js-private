/**
 * Barrel re-export for the paywall component — exposes the
 * Paywall Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PaywallProps, PaywallPropsSchema } from './Paywall.svelte';

export {
  Root,
  type PaywallProps,
  PaywallPropsSchema,
  //
  Root as Paywall,
};
