/**
 * Barrel re-export for the sankey-diagram component —
 * exposes the SankeyDiagram Svelte component, its props
 * type, and the props schema under stable public names.
 *
 * @module
 */

import Root, { type SankeyDiagramProps, SankeyDiagramPropsSchema } from './SankeyDiagram.svelte';

export {
  Root,
  type SankeyDiagramProps,
  SankeyDiagramPropsSchema,
  //
  Root as SankeyDiagram,
};
