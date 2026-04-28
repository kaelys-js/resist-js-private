/**
 * Barrel re-export for the taskbar component — exposes the
 * Taskbar Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type TaskbarProps, TaskbarPropsSchema } from './Taskbar.svelte';

export {
  Root,
  type TaskbarProps,
  TaskbarPropsSchema,
  //
  Root as Taskbar,
};
