/**
 * Barrel re-export for the alert compound component — exposes
 * Root / Title / Description sub-components under both internal
 * aliases and the `Alert*` public names, plus the
 * `alertVariants` helper and `AlertVariant` type.
 *
 * @module
 */

import Root from './alert.svelte';
import Description from './alert-description.svelte';
import Title from './alert-title.svelte';
export { alertVariants, type AlertVariant } from './alert.svelte';

export {
  Root,
  Description,
  Title,
  //
  Root as Alert,
  Description as AlertDescription,
  Title as AlertTitle,
};
