/**
 * Barrel re-export for the flex component — exposes the Flex
 * Svelte component, its props type, and the props schema under
 * stable public names.
 *
 * @module
 */

import Root, { type FlexProps, FlexPropsSchema } from './Flex.svelte';

export {
  Root,
  type FlexProps,
  FlexPropsSchema,
  //
  Root as Flex,
};
