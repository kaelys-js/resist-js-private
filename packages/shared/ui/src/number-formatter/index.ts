/**
 * Barrel re-export for the number-formatter component —
 * exposes the NumberFormatter Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type NumberFormatterProps,
  NumberFormatterPropsSchema,
} from './NumberFormatter.svelte';

export {
  Root,
  type NumberFormatterProps,
  NumberFormatterPropsSchema,
  //
  Root as NumberFormatter,
};
