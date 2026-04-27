/**
 * Barrel re-export for the button-group compound component —
 * exposes Root / Text / Separator sub-components under both
 * internal aliases and the `ButtonGroup*` public names.
 *
 * @module
 */

import Root from './button-group.svelte';
import Text from './button-group-text.svelte';
import Separator from './button-group-separator.svelte';

export {
  Root,
  Text,
  Separator,
  //
  Root as ButtonGroup,
  Text as ButtonGroupText,
  Separator as ButtonGroupSeparator,
};
