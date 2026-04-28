/**
 * Barrel re-export for the pull-quote component — exposes the
 * PullQuote Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PullQuoteProps, PullQuotePropsSchema } from './PullQuote.svelte';

export {
  Root,
  type PullQuoteProps,
  PullQuotePropsSchema,
  //
  Root as PullQuote,
};
