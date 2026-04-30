/**
 * Barrel re-export for the toggle-group component — exposes
 * the ToggleGroup root and ToggleGroupItem under stable
 * public names.
 *
 * @module
 */

import Root from './toggle-group.svelte';
import Item from './toggle-group-item.svelte';

export {
  Root,
  Item,
  //
  Root as ToggleGroup,
  Item as ToggleGroupItem,
};
