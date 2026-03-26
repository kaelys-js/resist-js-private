#!/usr/bin/env node

/**
 * resist-lint — Custom Linter CLI Entry Point
 *
 * Thin wrapper that parses process.argv and delegates to `runLinter()`.
 * All logic lives in `cli-helpers.ts` for testability.
 *
 * @module
 */

import { parseCliArgs, runLinter, type CliArgs, type CliOutput } from '@/lint/cli-helpers.ts';

// =============================================================================
// Entry Point
// =============================================================================

try {
  const args: CliArgs = parseCliArgs(process.argv.slice(2));
  const output: CliOutput = {
    stdout: (msg: string): void => {
      process.stdout.write(msg);
    },
    stderr: (msg: string): void => {
      process.stderr.write(msg);
    },
  };
  const code: number = await runLinter(args, output);
  process.exit(code);
} catch (error: unknown) {
  process.stderr.write(`Linter crashed: ${String(error)}\n`);
  process.exit(2);
}
