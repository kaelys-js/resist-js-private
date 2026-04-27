/**
 * Barrel re-export for the device-card component — exposes the
 * `DeviceCard` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DeviceCardProps, DeviceCardPropsSchema } from './DeviceCard.svelte';

export {
  Root,
  type DeviceCardProps,
  DeviceCardPropsSchema,
  //
  Root as DeviceCard,
};
