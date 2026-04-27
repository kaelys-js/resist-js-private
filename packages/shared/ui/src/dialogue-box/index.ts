/**
 * Barrel re-export for the dialogue-box component — exposes the
 * `DialogueBox` Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type DialogueBoxProps, DialogueBoxPropsSchema } from './DialogueBox.svelte';

export {
  Root,
  type DialogueBoxProps,
  DialogueBoxPropsSchema,
  //
  Root as DialogueBox,
};
