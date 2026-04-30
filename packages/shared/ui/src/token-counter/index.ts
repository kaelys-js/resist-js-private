/**
 * Barrel re-export for the token-counter component — exposes
 * the TokenCounter Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type TokenCounterProps, TokenCounterPropsSchema } from './TokenCounter.svelte';

export {
  Root,
  type TokenCounterProps,
  TokenCounterPropsSchema,
  //
  Root as TokenCounter,
};
