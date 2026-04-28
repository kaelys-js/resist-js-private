/**
 * Barrel re-export for the release-notes component — exposes
 * the ReleaseNotes Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ReleaseNotesProps, ReleaseNotesPropsSchema } from './ReleaseNotes.svelte';

export {
  Root,
  type ReleaseNotesProps,
  ReleaseNotesPropsSchema,
  //
  Root as ReleaseNotes,
};
