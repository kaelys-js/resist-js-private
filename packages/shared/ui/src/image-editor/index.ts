/**
 * Barrel re-export for the image-editor component — exposes
 * the ImageEditor Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type ImageEditorProps, ImageEditorPropsSchema } from './ImageEditor.svelte';

export {
  Root,
  type ImageEditorProps,
  ImageEditorPropsSchema,
  //
  Root as ImageEditor,
};
