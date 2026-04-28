/**
 * Barrel re-export for the phone-mockup component — exposes
 * the PhoneMockup Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type PhoneMockupProps, PhoneMockupPropsSchema } from './PhoneMockup.svelte';

export {
  Root,
  type PhoneMockupProps,
  PhoneMockupPropsSchema,
  //
  Root as PhoneMockup,
};
