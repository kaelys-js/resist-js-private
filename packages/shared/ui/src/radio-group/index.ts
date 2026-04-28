/**
 * Barrel re-export for the radio-group component — exposes
 * the RadioGroup root and RadioGroupItem (Bits UI `RadioGroup`
 * wrappers) under stable public names.
 *
 * @module
 */

import Root from './radio-group.svelte';
import Item from './radio-group-item.svelte';

export {
  Root,
  Item,
  //
  Root as RadioGroup,
  Item as RadioGroupItem,
};
