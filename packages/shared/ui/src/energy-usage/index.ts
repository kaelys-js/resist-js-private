/**
 * Barrel re-export for the energy-usage component — exposes
 * the EnergyUsage Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type EnergyUsageProps, EnergyUsagePropsSchema } from './EnergyUsage.svelte';

export {
  Root,
  type EnergyUsageProps,
  EnergyUsagePropsSchema,
  //
  Root as EnergyUsage,
};
