/**
 * Barrel re-export for the checkbox component — exposes the
 * `Checkbox` Svelte component under both the internal `Root`
 * alias and the public `Checkbox` name.
 *
 * @module
 */

import Root from './checkbox.svelte';
export {
  Root,
  //
  Root as Checkbox,
};
