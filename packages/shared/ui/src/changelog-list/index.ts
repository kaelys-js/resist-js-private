/**
 * Barrel re-export for the changelog-list component — exposes
 * the `ChangelogList` Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ChangelogListProps, ChangelogListPropsSchema } from './ChangelogList.svelte';

export {
  Root,
  type ChangelogListProps,
  ChangelogListPropsSchema,
  //
  Root as ChangelogList,
};
