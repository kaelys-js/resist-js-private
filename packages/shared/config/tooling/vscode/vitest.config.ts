/**
 * Vitest Configuration for the Resist VSCode Extension
 *
 * Configures the vscode module mock and test file discovery.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 9
 */

import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    root: path.resolve(import.meta.dirname, 'src'),
    include: ['**/*.test.ts'],
    alias: {
      vscode: path.resolve(import.meta.dirname, 'src/__mocks__/vscode.ts'),
    },
  },
});
