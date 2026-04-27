/**
 * Barrel re-export for the delivery-status component — exposes
 * the `DeliveryStatus` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type DeliveryStatusProps, DeliveryStatusPropsSchema } from './DeliveryStatus.svelte';

export {
  Root,
  type DeliveryStatusProps,
  DeliveryStatusPropsSchema,
  //
  Root as DeliveryStatus,
};
