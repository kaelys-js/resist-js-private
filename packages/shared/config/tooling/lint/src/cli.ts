#!/usr/bin/env node

/**
 * resist-lint — Custom Linter CLI Entry Point
 *
 * Thin wrapper that parses process.argv and delegates to `runLinter()`.
 * All logic lives in `cli-helpers.ts` for testability.
 *
 * @module
 */

import { type CliArgs, type CliOutput, parseCliArgs, runLinter } from '@/lint/cli-helpers.ts';
import { en } from '@/lint/locale/locales/en.ts';
import { format } from '@/lint/locale/schema.ts';

// =============================================================================
// Entry Point
// =============================================================================

try {
  const args: CliArgs = parseCliArgs(process.argv.slice(2));
  const output: CliOutput = {
    stderr: (msg: string): void => {
      process.stderr.write(msg);
    },
    stdout: (msg: string): void => {
      process.stdout.write(msg);
    },
  };
  const code: number = await runLinter(args, output);
  process.exit(code);
} catch (error: unknown) {
  process.stderr.write(`${format(en.errors.crash, { error: String(error) })}\n`);
  process.exit(2);
}
