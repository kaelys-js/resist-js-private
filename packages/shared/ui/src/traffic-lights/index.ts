/**
 * Barrel re-export for the traffic-lights component — exposes
 * the TrafficLights Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type TrafficLightsProps, TrafficLightsPropsSchema } from './TrafficLights.svelte';

export {
  Root,
  type TrafficLightsProps,
  TrafficLightsPropsSchema,
  //
  Root as TrafficLights,
};
