/**
 * Barrel re-export for the thermostat-control component —
 * exposes the ThermostatControl Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ThermostatControlProps,
  ThermostatControlPropsSchema,
} from './ThermostatControl.svelte';

export {
  Root,
  type ThermostatControlProps,
  ThermostatControlPropsSchema,
  //
  Root as ThermostatControl,
};
