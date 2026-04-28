/**
 * Barrel re-export for the playlist component — exposes the
 * Playlist Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type PlaylistProps, PlaylistPropsSchema } from './Playlist.svelte';

export {
  Root,
  type PlaylistProps,
  PlaylistPropsSchema,
  //
  Root as Playlist,
};
