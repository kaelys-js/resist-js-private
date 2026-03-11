/**
 * Format English Strings
 *
 * @module
 */

import type { FormatStrings } from '@/cli/tools/format/locales/schema';

/** English strings for format tool. */
export const en: FormatStrings = {
  name: 'Format',
  description: 'Multi-language code formatting (90+ file types)',

  // Flag descriptions
  flags: {
    check: 'Report unformatted files without modifying them',
    diff: 'Show unified diff of changes',
    listFormatters: 'List all available formatters',
    checkTools: 'Check if formatter tools are installed',
    installTools: 'Install missing formatter tools',
    listIgnored: 'Show ignore patterns',
  },

  // Examples
  examples: [
    // Basic usage
    { command: '{pmTool} format .', description: 'Format all files' },
    { command: '{pmTool} format src/**/*.ts', description: 'Format specific files' },
    { command: '{pmTool} format --check .', description: 'Check without modifying' },
    { command: '{pmTool} format --diff src/', description: 'Show diffs' },
    { command: '{pmTool} format -C --diff .', description: 'Check mode with diffs' },
    // Stdin
    {
      command: 'cat file.ts | {pmTool} format --stdin --stdin-filepath file.ts',
      description: 'Format from stdin',
    },
    // Tool management
    { command: '{pmTool} format --list-formatters', description: 'List supported formatters' },
    { command: '{pmTool} format --check-tools', description: 'Check tool availability' },
    { command: '{pmTool} format --install-tools', description: 'Install missing tools' },
    // Output formats
    { command: '{pmTool} format --json .', description: 'JSON output' },
    { command: '{pmTool} format --format=junit .', description: 'JUnit XML output' },
    { command: '{pmTool} format --format=github .', description: 'GitHub Actions annotations' },
    // Progress and verbosity
    { command: '{pmTool} format --progress .', description: 'Show progress bar' },
    { command: '{pmTool} format --verbose .', description: 'Verbose output' },
    { command: '{pmTool} format --quiet .', description: 'Suppress output' },
    // Filtering
    { command: '{pmTool} format --filter "utils" .', description: 'Filter files by pattern' },
    { command: '{pmTool} format --ignore "*.min.js" .', description: 'Ignore specific patterns' },
    // Concurrency
    { command: '{pmTool} format --serial .', description: 'Run sequentially' },
    { command: '{pmTool} format --concurrency=4 .', description: 'Limit parallel tasks' },
    { command: '{pmTool} format --fail-fast .', description: 'Stop on first error' },
    // Other
    { command: '{pmTool} format --dry-run .', description: 'Preview mode (no changes)' },
    { command: '{pmTool} format --cwd=packages/app .', description: 'Run in different directory' },
  ],

  // Exit codes
  exitCodes: [
    { code: 0, description: 'All files formatted or already formatted' },
    { code: 1, description: 'Some files need formatting (--check) or errors occurred' },
    { code: 2, description: 'Invalid command usage or arguments' },
    { code: 3, description: 'Unexpected fatal error' },
    { code: 130, description: 'Operation interrupted by user (Ctrl+C)' },
  ],

  // Info mode headers
  formatterListHeader: 'Available Formatters',
  toolAvailabilityHeader: 'Formatter Tool Availability',
  formatIgnoreHeader: 'Ignore Patterns (.formatignore)',
  noFormatIgnoreFound: 'No .formatignore file found in the workspace root',

  // Tool availability
  toolInstalled: 'installed',
  toolNotFound: 'not found',
  toolSummary: '{available} available, {missing} missing',

  // Formatter list
  formatterCount: '{count, plural, one {Total: # formatter} other {Total: # formatters}}',

  // Install tools
  installingToolsHeader: 'Installing Missing Tools',
  installSummary: '{installed} installed, {failed} failed, {skipped} already installed',
  noToolsToInstall: 'All formatter tools are already installed.',

  // Brew lock
  brewLockWaiting: 'Waiting for existing brew process to finish...',
  brewLockTimeout: 'Timed out waiting for brew. Kill existing brew processes and retry.',
};
