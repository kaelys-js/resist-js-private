/**
 * Barrel re-export for the hover-card compound component —
 * exposes Root / Content / Trigger / Portal sub-components
 * under both internal aliases and the `HoverCard*` public
 * names.
 *
 * @module
 */

import Root from './hover-card.svelte';
import Content from './hover-card-content.svelte';
import Trigger from './hover-card-trigger.svelte';
import Portal from './hover-card-portal.svelte';

export {
  Root,
  Content,
  Trigger,
  Portal,
  Root as HoverCard,
  Content as HoverCardContent,
  Trigger as HoverCardTrigger,
  Portal as HoverCardPortal,
};
