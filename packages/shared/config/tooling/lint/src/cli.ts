#!/usr/bin/env node

/**
 * resist-lint — Custom Linter CLI Entry Point
 *
 * Thin wrapper that parses process.argv and delegates to `runLinter()`.
 * All logic lives in `cli-helpers.ts` for testability.
 *
 * @module
 */

import { delimiter, join } from 'node:path';

import { type CliArgs, type CliOutput, parseCliArgs, runLinter } from '@/lint/cli-helpers.ts';
import { findWorkspaceRoot } from '@/lint/framework/tool-orchestrator.ts';
import { resolveLocale, type LocaleResult } from '@/lint/locale/registry.ts';
import { format } from '@/lint/locale/schema.ts';

/* Extend PATH with workspace `node_modules/.bin` so spawned tools (oxlint,
 * tsgo, svelte-check) installed via pnpm are discoverable by child processes
 * that look up commands by bare name. Mirrors what `pnpm run` does. */
const __workspaceRoot: string | null = findWorkspaceRoot(process.cwd());

if (__workspaceRoot !== null) {
  const binDir: string = join(__workspaceRoot, 'node_modules', '.bin');
  const currentPath: string = process.env['PATH'] ?? '';

  if (!currentPath.split(delimiter).includes(binDir)) {
    process.env['PATH'] = `${binDir}${delimiter}${currentPath}`;
  }
}

// =============================================================================
// Entry Point
// =============================================================================

/**
 * Read all data from stdin as a UTF-8 string.
 *
 * @returns {Promise<string>} The complete stdin content
 */
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
  });
}

try {
  const args: CliArgs = parseCliArgs(process.argv.slice(2));

  /* Read stdin when --stdin-filename is set */
  let stdinContent: string | undefined;

  if (args.stdinFilename) {
    stdinContent = await readStdin();
  }

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
  const code: number = await runLinter(args, output, localeResult.strings, stdinContent);
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
