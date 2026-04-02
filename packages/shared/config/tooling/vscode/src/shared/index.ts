/**
 * Shared Module Barrel
 *
 * Re-exports shared utilities for the extension entry point.
 * Reduces import count to satisfy max-dependencies rule.
 *
 * @module
 */

export { DocumentDebouncer } from './debounce';
export { createToolStatusBar, updateStatusBar, getFileDiagnosticCounts } from './status-bar';
export { ToolStateManager, stateLabel } from './state';
export type { ToolState } from './state';
export { createOutputChannel, log, logError } from './output';
export { extractMessage, safeRun, safeRunAsync } from './errors';
export { resolveWorkspace } from './workspace';
export { isWorkspaceDocument, isLintableDocument, forEachOpenDocument } from './document-filter';
export { withFileProgress } from './progress';
export { NotificationManager } from './notifications';
export { LifecycleManager } from './lifecycle';
export { DocumentEventRegistry } from './events';
export { createBatchedFileWatcher } from './file-watcher';
export { ConfigManager, onConfigurationChange } from './config';
export {
  BINARY_NAME,
  COMMANDS,
  CONFIG_SECTION,
  CONFIG_LINT_SECTION,
  DIAGNOSTIC_COLLECTION_NAME,
  PREVIEW_SCHEME,
  PANEL_CONTAINER_ID,
  PANEL_VIEW_ID,
} from './brand';
