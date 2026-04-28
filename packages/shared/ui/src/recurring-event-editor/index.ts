/**
 * Barrel re-export for the recurring-event-editor component
 * — exposes the RecurringEventEditor Svelte component, its
 * props type, and the props schema under stable public
 * names.
 *
 * @module
 */

import Root, {
  type RecurringEventEditorProps,
  RecurringEventEditorPropsSchema,
} from './RecurringEventEditor.svelte';

export {
  Root,
  type RecurringEventEditorProps,
  RecurringEventEditorPropsSchema,
  //
  Root as RecurringEventEditor,
};
