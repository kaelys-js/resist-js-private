/**
 * Barrel re-export for the api-response-viewer component —
 * exposes the `ApiResponseViewer` Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, {
  type ApiResponseViewerProps,
  ApiResponseViewerPropsSchema,
} from './ApiResponseViewer.svelte';

export {
  Root,
  type ApiResponseViewerProps,
  ApiResponseViewerPropsSchema,
  //
  Root as ApiResponseViewer,
};
