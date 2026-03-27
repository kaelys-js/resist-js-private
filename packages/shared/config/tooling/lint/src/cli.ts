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
import { resolveLocale, type LocaleResult } from '@/lint/locale/registry.ts';
import { format } from '@/lint/locale/schema.ts';

// =============================================================================
// Entry Point
// =============================================================================

try {
  const args: CliArgs = parseCliArgs(process.argv.slice(2));

  /* Resolve locale from --locale flag */
  const localeResult: LocaleResult = resolveLocale(args.locale);
  if (!localeResult.ok) {
    process.stderr.write(`${localeResult.error}\n`);
    process.exit(1);
  }

  const output: CliOutput = {
    stderr: (msg: string): void => {
      process.stderr.write(msg);
    },
    stdout: (msg: string): void => {
      process.stdout.write(msg);
    },
  };
  const code: number = await runLinter(args, output, localeResult.strings);
  process.exit(code);
} catch (error: unknown) {
  /* Fallback to en for crash messages since locale may not be resolved */
  const fallback: LocaleResult = resolveLocale();
  const crashMsg: string = fallback.ok
    ? format(fallback.strings.errors.crash, { error: String(error) })
    : String(error);
  process.stderr.write(`${crashMsg}\n`);
  process.exit(2);
}
