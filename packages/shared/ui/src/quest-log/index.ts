/**
 * Barrel re-export for the quest-log component — exposes the
 * QuestLog Svelte component, its props type, and the props
 * schema under stable public names.
 *
 * @module
 */

import Root, { type QuestLogProps, QuestLogPropsSchema } from './QuestLog.svelte';

export {
  Root,
  type QuestLogProps,
  QuestLogPropsSchema,
  //
  Root as QuestLog,
};
