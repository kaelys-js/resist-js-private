/**
 * Simple Command Wrapper
 *
 * Thin wrapper that reuses runner infrastructure for non-file-processing commands.
 * Use createCommand for one-shot, server, and wrapper commands that don't need
 * the full task runner functionality.
 *
 * Every function returns `Result<T>`. No function throws.
 *
 * @module
 */

import {
  CommandDefinitionSchema,
  type CommandContext,
  type CommandDefinition,
  type CommandRunner,
  type FlagDefinition,
  type InvokeOptions,
  type InvokeResult,
} from '@/cli/schemas';
import { type InitializeCliResult, initializeCli } from '@/cli/utils/core';
import { COMMAND_FLAG_DEFS, buildArgvFromFlags } from '@/cli/utils/flags';
import {
  type Bool,
  type ExitCode,
  ExitCodeSchema,
  type Str,
  type StrArray,
  StrArraySchema,
  type Void,
} from '@/schemas/common';
import { ERRORS, type Result, err, ok, okUnchecked } from '@/schemas/result/result';
import { deepFreeze } from '@/utils/core/object';
import { fromUnknownError, safeParse } from '@/utils/result/safe';

// =============================================================================
// Main Factory
// =============================================================================

/**
 * Creates a simple command runner.
 *
 * Use this for one-shot, server, and wrapper commands that don't need
 * the full task runner functionality (file discovery, parallel execution, etc.).
 *
 * Locales are auto-discovered from `tools/<id>/locales/locales/<code>.ts`.
 * The definition only specifies metadata and the handler — locale strings
 * are loaded at runtime based on the `--locale` flag.
 *
 * @param definition - Command definition (id, version, optional flagDefs, handler).
 * @returns `Result<CommandRunner<TStrings, TToolFlags>>` — the command runner, or
 *          a validation error if the definition is invalid.
 *
 * @example
 * ```typescript
 * import { TOOL_FLAG_DEFS } from './flags';
 *
 * const command = createCommand({
 *   id: 'dev-proxy',
 *   version: '1.0.0',
 *   flagDefs: TOOL_FLAG_DEFS,
 *   handler: async (ctx) => {
 *     const expose = ctx.options.expose as Boolean;
 *     // ctx.locale.command.name + 'starting'
 *   },
 * });
 *
 * export { command };
 * ```
 */
export function createCommand<
  TStrings = unknown,
  TToolFlags extends Record<string, unknown> = Record<string, unknown>,
>(
  definition: CommandDefinition<TStrings, TToolFlags>,
): Result<CommandRunner<TStrings, TToolFlags>> {
  const validationResult: Result<CommandDefinition<TStrings, TToolFlags>> = safeParse(
    CommandDefinitionSchema,
    definition,
  );
  if (!validationResult.ok) return validationResult;

  const runner: CommandRunner<TStrings, TToolFlags> = {
    run: async (): Promise<Result<ExitCode>> => {
      try {
        const initResult: Result<InitializeCliResult<TStrings>> =
          await initializeCli<TStrings>(definition);
        if (!initResult.ok) return initResult;
        const init = initResult.data;

        if (init.kind === 'exit') {
          return ok(ExitCodeSchema, init.code);
        }

        const ctxResult: Result<CommandContext<TStrings, TToolFlags>> = okUnchecked<
          CommandContext<TStrings, TToolFlags>
        >(
          deepFreeze({
            options: init.options,
            locale: {
              cli: init.cliStrings,
              command: init.toolStrings,
            },
            args: init.args,
            cwd: init.cwd,
          }),
        );
        const ctx: CommandContext<TStrings, TToolFlags> = ctxResult.data;

        const handlerResult: Result<Void> = await definition.handler(ctx);
        if (!handlerResult.ok) return handlerResult;

        return ok(ExitCodeSchema, 0);
      } catch (thrown: unknown) {
        return err(ERRORS.INTERNAL.UNEXPECTED, {
          cause: fromUnknownError(thrown),
          meta: { commandId: definition.id },
        });
      }
    },

    /**
     * Programmatically invoke this command with typed flags.
     *
     * Converts flag values to an argv array and runs through the standard
     * initialization pipeline (validation, env detection, locale resolution).
     *
     * @param options - Invocation options (flags, args, cwd, locale, silent).
     * @returns `Promise<Result<InvokeResult>>` — exit code and metadata.
     *
     * @example
     * ```typescript
     * const result = await command.data.invoke({
     *   flags: { verbose: true, dryRun: true },
     *   cwd: '/my/project',
     * });
     * if (result.ok) {
     *   const exitCode: ExitCode = result.data.exitCode;
     * }
     * ```
     */
    invoke: async (options?: InvokeOptions<TToolFlags>): Promise<Result<InvokeResult>> => {
      try {
        // Build flag definitions (framework + tool)
        const allFlagDefs: readonly FlagDefinition[] = definition.flagDefs
          ? [...COMMAND_FLAG_DEFS, ...definition.flagDefs]
          : COMMAND_FLAG_DEFS;

        // Build argv from provided flags
        const flagRecord: Record<Str, unknown> = {
          ...(options?.flags ?? {}),
        };

        // Inject silent mode flags
        const silent: Bool = options?.silent !== false;
        if (silent) {
          flagRecord.quiet = true;
          flagRecord.noHeader = true;
        }

        // Inject cwd if provided
        if (options?.cwd) {
          flagRecord.cwd = options.cwd;
        }

        // Inject locale if provided
        if (options?.locale) {
          flagRecord.locale = options.locale;
        }

        const argvResult: Result<StrArray> = buildArgvFromFlags(flagRecord, allFlagDefs);
        if (!argvResult.ok) return argvResult;

        // Append positional args
        const argv: StrArray = [...argvResult.data, ...(options?.args ?? [])];
        const validatedArgv: Result<StrArray> = safeParse(StrArraySchema, argv);
        if (!validatedArgv.ok) return validatedArgv;

        // Initialize with override args
        const initResult: Result<InitializeCliResult<TStrings>> = await initializeCli<TStrings>(
          definition,
          validatedArgv.data,
        );
        if (!initResult.ok) return initResult;
        const init = initResult.data;

        if (init.kind === 'exit') {
          return okUnchecked<InvokeResult>({
            exitCode: init.code,
          });
        }

        const ctx: CommandContext<TStrings, TToolFlags> = deepFreeze({
          options: init.options,
          locale: {
            cli: init.cliStrings,
            command: init.toolStrings,
          },
          args: init.args,
          cwd: init.cwd,
        });

        const handlerResult: Result<Void> = await definition.handler(ctx);
        if (!handlerResult.ok) {
          return okUnchecked<InvokeResult>({
            exitCode: 1,
          });
        }

        return okUnchecked<InvokeResult>({
          exitCode: 0,
        });
      } catch (thrown: unknown) {
        return err(ERRORS.INTERNAL.UNEXPECTED, {
          cause: fromUnknownError(thrown),
          meta: { commandId: definition.id },
        });
      }
    },
  };

  return okUnchecked<CommandRunner<TStrings, TToolFlags>>(runner);
}
