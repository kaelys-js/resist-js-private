/**
 * Panel Module Barrel
 *
 * Re-exports panel components for the extension entry point.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 3
 *
 * @module
 */

export {
  SectionItem,
  ToolStatusItem,
  FileDiagnosticItem,
  DiagnosticDetailItem,
  PlaceholderItem,
} from './tree-items';
export type { TreeItemKind, ToolKey } from './tree-items';
export { ResistTreeDataProvider } from './tree-data-provider';
export { registerPanel } from './panel';
