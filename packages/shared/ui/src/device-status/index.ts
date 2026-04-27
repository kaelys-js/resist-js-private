/**
 * Barrel re-export for the device-status component — exposes
 * the `DeviceStatus` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type DeviceStatusProps, DeviceStatusPropsSchema } from './DeviceStatus.svelte';

export {
  Root,
  type DeviceStatusProps,
  DeviceStatusPropsSchema,
  //
  Root as DeviceStatus,
};
