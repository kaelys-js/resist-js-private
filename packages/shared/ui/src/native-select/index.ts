/**
 * Barrel re-export for the native-select compound component
 * — exposes Root / Option / OptGroup sub-components under
 * both internal aliases and the `NativeSelect*` public names.
 *
 * @module
 */

import Root from './native-select.svelte';
import Option from './native-select-option.svelte';
import OptGroup from './native-select-opt-group.svelte';

export {
  Root,
  Option,
  OptGroup,
  Root as NativeSelect,
  Option as NativeSelectOption,
  OptGroup as NativeSelectOptGroup,
};
