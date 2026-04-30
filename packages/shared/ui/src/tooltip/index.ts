/**
 * Barrel re-export for the tooltip component — exposes the
 * Tooltip root and its Bits UI subcomponent wrappers
 * (Trigger, Content, Provider, Portal) under stable public
 * names.
 *
 * @module
 */

import Root from './tooltip.svelte';
import Trigger from './tooltip-trigger.svelte';
import Content from './tooltip-content.svelte';
import Provider from './tooltip-provider.svelte';
import Portal from './tooltip-portal.svelte';

export {
  Root,
  Trigger,
  Content,
  Provider,
  Portal,
  //
  Root as Tooltip,
  Content as TooltipContent,
  Trigger as TooltipTrigger,
  Provider as TooltipProvider,
  Portal as TooltipPortal,
};
