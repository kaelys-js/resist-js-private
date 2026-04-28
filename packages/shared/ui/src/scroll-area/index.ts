/**
 * Barrel re-export for the scroll-area component — exposes
 * the ScrollArea root and ScrollAreaScrollbar (Bits UI
 * `ScrollArea` wrappers) under stable public names.
 *
 * @module
 */

import Scrollbar from './scroll-area-scrollbar.svelte';
import Root from './scroll-area.svelte';

export {
  Root,
  Scrollbar,
  //,
  Root as ScrollArea,
  Scrollbar as ScrollAreaScrollbar,
};
