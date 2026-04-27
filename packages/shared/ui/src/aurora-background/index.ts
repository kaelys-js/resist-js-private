/**
 * Barrel re-export for the aurora-background component — exposes
 * the `AuroraBackground` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AuroraBackgroundProps,
  AuroraBackgroundPropsSchema,
} from './AuroraBackground.svelte';

export {
  Root,
  type AuroraBackgroundProps,
  AuroraBackgroundPropsSchema,
  //
  Root as AuroraBackground,
};
