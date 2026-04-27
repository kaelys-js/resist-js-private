/**
 * Barrel re-export for the cron-editor component — exposes the
 * `CronEditor` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type CronEditorProps, CronEditorPropsSchema } from './CronEditor.svelte';

export {
  Root,
  type CronEditorProps,
  CronEditorPropsSchema,
  //
  Root as CronEditor,
};
