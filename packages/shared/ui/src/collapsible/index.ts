/**
 * Barrel re-export for the collapsible compound component —
 * exposes Root / Trigger / Content sub-components under both
 * internal aliases and the `Collapsible*` public names.
 *
 * @module
 */

import Root from './collapsible.svelte';
import Trigger from './collapsible-trigger.svelte';
import Content from './collapsible-content.svelte';

export {
  Root,
  Content,
  Trigger,
  //
  Root as Collapsible,
  Content as CollapsibleContent,
  Trigger as CollapsibleTrigger,
};
