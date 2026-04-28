/**
 * Barrel re-export for the download-button component — exposes
 * the `DownloadButton` Svelte component, its props type, and
 * the props schema under stable public names.
 *
 * @module
 */

import Root, { type DownloadButtonProps, DownloadButtonPropsSchema } from './DownloadButton.svelte';

export {
  Root,
  type DownloadButtonProps,
  DownloadButtonPropsSchema,
  //
  Root as DownloadButton,
};
