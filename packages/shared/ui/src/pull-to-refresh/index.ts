/**
 * Barrel re-export for the pull-to-refresh component —
 * exposes the PullToRefresh Svelte component, its props type,
 * and the props schema under stable public names.
 *
 * @module
 */

import Root, { type PullToRefreshProps, PullToRefreshPropsSchema } from './PullToRefresh.svelte';

export {
  Root,
  type PullToRefreshProps,
  PullToRefreshPropsSchema,
  //
  Root as PullToRefresh,
};
