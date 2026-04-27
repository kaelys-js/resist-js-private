/**
 * Barrel re-export for the accordion-menu component — exposes
 * the `AccordionMenu` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type AccordionMenuProps, AccordionMenuPropsSchema } from './AccordionMenu.svelte';

export {
  Root,
  type AccordionMenuProps,
  AccordionMenuPropsSchema,
  //
  Root as AccordionMenu,
};
