/**
 * Barrel re-export for the tabs component — exposes the Tabs
 * root and its Bits UI subcomponent wrappers (Content, List,
 * Trigger) under stable public names.
 *
 * @module
 */

import Root from './tabs.svelte';
import Content from './tabs-content.svelte';
import List from './tabs-list.svelte';
import Trigger from './tabs-trigger.svelte';

export {
  Root,
  Content,
  List,
  Trigger,
  //
  Root as Tabs,
  Content as TabsContent,
  List as TabsList,
  Trigger as TabsTrigger,
};
