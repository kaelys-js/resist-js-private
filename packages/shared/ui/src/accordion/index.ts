/**
 * Barrel re-export for the accordion compound component —
 * exposes the Root / Item / Trigger / Content sub-components
 * under both internal aliases and the `Accordion*` public names.
 *
 * @module
 */

import Root from './accordion.svelte';
import Content from './accordion-content.svelte';
import Item from './accordion-item.svelte';
import Trigger from './accordion-trigger.svelte';

export {
  Root,
  Content,
  Item,
  Trigger,
  //
  Root as Accordion,
  Content as AccordionContent,
  Item as AccordionItem,
  Trigger as AccordionTrigger,
};
