/**
 * Barrel re-export for the satellite-toggle component —
 * exposes the SatelliteToggle Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type SatelliteToggleProps,
  SatelliteTogglePropsSchema,
} from './SatelliteToggle.svelte';

export {
  Root,
  type SatelliteToggleProps,
  SatelliteTogglePropsSchema,
  //
  Root as SatelliteToggle,
};
