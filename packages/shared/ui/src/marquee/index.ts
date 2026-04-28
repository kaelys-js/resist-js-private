/**
 * Barrel re-export for the marquee component — exposes the
 * Marquee Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type MarqueeProps, MarqueePropsSchema } from './Marquee.svelte';

export {
  Root,
  type MarqueeProps,
  MarqueePropsSchema,
  //
  Root as Marquee,
};
