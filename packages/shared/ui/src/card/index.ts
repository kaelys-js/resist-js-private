/**
 * Barrel re-export for the card compound component — exposes
 * Root / Content / Description / Footer / Header / Title /
 * Action sub-components under both internal aliases and the
 * `Card*` public names.
 *
 * @module
 */

import Root from './card.svelte';
import Content from './card-content.svelte';
import Description from './card-description.svelte';
import Footer from './card-footer.svelte';
import Header from './card-header.svelte';
import Title from './card-title.svelte';
import Action from './card-action.svelte';

export {
  Root,
  Content,
  Description,
  Footer,
  Header,
  Title,
  Action,
  //
  Root as Card,
  Content as CardContent,
  Description as CardDescription,
  Footer as CardFooter,
  Header as CardHeader,
  Title as CardTitle,
  Action as CardAction,
};
