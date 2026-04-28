/**
 * Barrel re-export for the scroll-trigger component — exposes
 * the ScrollTrigger Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type ScrollTriggerProps, ScrollTriggerPropsSchema } from './ScrollTrigger.svelte';

export {
  Root,
  type ScrollTriggerProps,
  ScrollTriggerPropsSchema,
  //
  Root as ScrollTrigger,
};
