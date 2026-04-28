/**
 * Barrel re-export for the story-viewer component — exposes
 * the StoryViewer Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type StoryViewerProps, StoryViewerPropsSchema } from './StoryViewer.svelte';

export {
  Root,
  type StoryViewerProps,
  StoryViewerPropsSchema,
  //
  Root as StoryViewer,
};
