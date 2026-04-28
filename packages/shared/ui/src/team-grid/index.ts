/**
 * Barrel re-export for the team-grid component — exposes
 * the TeamGrid Svelte component, its props type, and the
 * props schema under stable public names.
 *
 * @module
 */

import Root, { type TeamGridProps, TeamGridPropsSchema } from './TeamGrid.svelte';

export {
  Root,
  type TeamGridProps,
  TeamGridPropsSchema,
  //
  Root as TeamGrid,
};
