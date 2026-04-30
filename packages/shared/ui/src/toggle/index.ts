/**
 * Barrel re-export for the toggle component — exposes the
 * Toggle Svelte component, its variant prop types, and
 * `toggleVariants` (tailwind-variants helper).
 *
 * @module
 */

import Root from './toggle.svelte';
export {
  toggleVariants,
  type ToggleSize,
  type ToggleVariant,
  type ToggleVariants,
} from './toggle.svelte';

export {
  Root,
  //
  Root as Toggle,
};
