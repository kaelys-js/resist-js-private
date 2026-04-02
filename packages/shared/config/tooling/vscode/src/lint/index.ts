/**
 * Lint Module Barrel
 *
 * Re-exports lint utilities for the extension entry point.
 * Reduces import count to satisfy max-dependencies rule.
 *
 * @module
 */

export { lintDocument } from './provider';
export type { LintOptions } from './provider';
export { ResistCodeActionProvider } from './code-actions';
export { FixDiffPreviewProvider } from './diff-preview';
export { DiagnosticFilter } from './diagnostic-filter';
export { StageIndicator } from './stage-indicator';
export { FixOnSaveManager } from './fix-on-save';
export { ResistCodeLensProvider } from './code-lens';
export { StaleDiagnosticCleaner } from './stale-cleanup';
export { ResistFormattingProvider } from './formatting-provider';
export { createConfigWatcher } from './watcher';
export { registerLintCommands } from './commands';
export { ResistHoverProvider } from './hover';
