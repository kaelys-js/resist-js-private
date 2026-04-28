/**
 * Barrel re-export for the spotlight component — exposes
 * the Spotlight Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type SpotlightProps, SpotlightPropsSchema } from './Spotlight.svelte';

export {
  Root,
  type SpotlightProps,
  SpotlightPropsSchema,
  //
  Root as Spotlight,
};
