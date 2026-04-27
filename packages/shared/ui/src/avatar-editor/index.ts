/**
 * Barrel re-export for the avatar-editor component — exposes the
 * `AvatarEditor` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type AvatarEditorProps, AvatarEditorPropsSchema } from './AvatarEditor.svelte';

export {
  Root,
  type AvatarEditorProps,
  AvatarEditorPropsSchema,
  //
  Root as AvatarEditor,
};
