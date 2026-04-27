/**
 * Barrel re-export for the announcement-bar component — exposes
 * the `AnnouncementBar` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type AnnouncementBarProps,
  AnnouncementBarPropsSchema,
} from './AnnouncementBar.svelte';

export {
  Root,
  type AnnouncementBarProps,
  AnnouncementBarPropsSchema,
  //
  Root as AnnouncementBar,
};
