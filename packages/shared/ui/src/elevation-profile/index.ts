/**
 * Barrel re-export for the elevation-profile component —
 * exposes the ElevationProfile Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ElevationProfileProps,
  ElevationProfilePropsSchema,
} from './ElevationProfile.svelte';

export {
  Root,
  type ElevationProfileProps,
  ElevationProfilePropsSchema,
  //
  Root as ElevationProfile,
};
