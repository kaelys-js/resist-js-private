/**
 * Barrel re-export for the breadcrumb compound component —
 * exposes Root / Ellipsis / Item / Link / List / Page / Separator
 * sub-components under both internal aliases and the
 * `Breadcrumb*` public names.
 *
 * @module
 */

import Root from './breadcrumb.svelte';
import Ellipsis from './breadcrumb-ellipsis.svelte';
import Item from './breadcrumb-item.svelte';
import Separator from './breadcrumb-separator.svelte';
import Link from './breadcrumb-link.svelte';
import List from './breadcrumb-list.svelte';
import Page from './breadcrumb-page.svelte';

export {
  Root,
  Ellipsis,
  Item,
  Separator,
  Link,
  List,
  Page,
  //
  Root as Breadcrumb,
  Ellipsis as BreadcrumbEllipsis,
  Item as BreadcrumbItem,
  Separator as BreadcrumbSeparator,
  Link as BreadcrumbLink,
  List as BreadcrumbList,
  Page as BreadcrumbPage,
};
