/**
 * Barrel re-export for the role-editor component — exposes
 * the RoleEditor Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type RoleEditorProps, RoleEditorPropsSchema } from './RoleEditor.svelte';

export {
  Root,
  type RoleEditorProps,
  RoleEditorPropsSchema,
  //
  Root as RoleEditor,
};
