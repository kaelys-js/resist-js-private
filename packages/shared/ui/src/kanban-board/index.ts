/**
 * Barrel re-export for the kanban-board component — exposes
 * the KanbanBoard Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type KanbanBoardProps, KanbanBoardPropsSchema } from './KanbanBoard.svelte';

export {
  Root,
  type KanbanBoardProps,
  KanbanBoardPropsSchema,
  //
  Root as KanbanBoard,
};
