/**
 * Help & Version Flag Definitions & Generation
 *
 * Defines `--help` and `--version` flags with active handlers that print
 * help/version output and abort the handler chain.
 *
 * Also provides help flag array builders for command and runner help screens.
 * `buildCommandHelpFlags` and `buildStandardHelpFlags` receive `flagDefs`
 * as a parameter (not imported) to avoid circular dependencies with
 * `flags/index.ts` auto-discovery.
 *
 * The `--help` handler owns the full rendering pipeline: it builds help flags
 * via `config.help.standardFlagsBuilder`, then renders the complete help screen
 * (header, usage, options, tool options, examples, exit codes).
 *
 * All functions return `Result<T>`. No function throws.
 *
 * @module
 */

import type { BuiltCliStrings } from '@/cli/locale/schema';
import {
  BuiltCliStringsSchema,
  ExampleDefinitionSchema,
  ExitCodeDefinitionSchema,
  FlagDefinitionArraySchema,
  HelpFlagEntryArraySchema,
  HelpFlagEntrySchema,
  NullableStandardFlagsResultSchema,
  OptionalFlagDescriptionFnSchema,
  OptionalToolFlagDescriptionsSchema,
  StandardFlagsResultSchema,
  type BaseLocaleStrings,
  type ExampleDefinition,
  type ExitCodeDefinition,
  type FlagDefinition,
  type HelpFlagEntry,
  type OptionalFlagDescriptionFn,
  type OptionalToolFlagDescriptions,
  type StandardFlagsConfig,
  type NullableStandardFlagsResult,
  type StandardFlagsResult,
} from '@/cli/schemas';
import {
  BoolSchema,
  StrSchema,
  VoidSchema,
  type Bool,
  type Str,
  type Void,
} from '@/schemas/common';
import { type Result, ok } from '@/schemas/result/result';
import { getPmExec } from '@/utils/core/shell';
import { padRight } from '@/utils/core/string';
import { log } from '@/utils/core/terminal';
import { safeParse } from '@/utils/result/safe';

// =============================================================================
// Help Generation
// =============================================================================

/**
 * Builds help flags from flag definitions with scope-aware description lookup.
 *
 * - Framework flags (`scope: 'command'` | `'runner'`): description from `cliStrings.flags[def.descriptionKey]`.
 * - Tool flags (`scope: 'tool'`): description from `toolFlagDescriptions[def.descriptionKey]`.
 *
 * Receives `flagDefs` as parameter to avoid circular dependency with
 * `flags/index.ts` auto-discovery.
 *
 * @param defs - Flag definitions to convert (framework + tool, all unified).
 * @param cliStrings - CLI framework locale strings for framework flag descriptions.
 * @param toolFlagDescriptions - Tool locale flag descriptions keyed by descriptionKey (for tool-scope flags).
 * @returns `Result<HelpFlagEntry[]>` — array of help flag objects for display, or a validation error.
 */
export function buildStandardHelpFlags(
  defs: readonly FlagDefinition[],
  cliStrings: BuiltCliStrings,
  toolFlagDescriptions?: OptionalToolFlagDescriptions,
): Result<HelpFlagEntry[]> {
  const defsResult: Result<FlagDefinition[]> = safeParse(FlagDefinitionArraySchema, defs);
  if (!defsResult.ok) return defsResult;
  const stringsResult: Result<BuiltCliStrings> = safeParse(BuiltCliStringsSchema, cliStrings);
  if (!stringsResult.ok) return stringsResult;
  const descriptionsResult: Result<OptionalToolFlagDescriptions> = safeParse(
    OptionalToolFlagDescriptionsSchema,
    toolFlagDescriptions,
  );
  if (!descriptionsResult.ok) return descriptionsResult;

  const helpFlags: HelpFlagEntry[] = [];
  for (const def of defsResult.data) {
    let description: Str;
    if (def.scope === 'tool' && descriptionsResult.data) {
      // Tool-scope flags get descriptions from tool locale strings
      description = descriptionsResult.data[def.descriptionKey] ?? def.name;
    } else {
      // Framework flags get descriptions from CLI locale strings
      const flagsObj: Record<string, unknown> = (cliStrings.flags ?? {}) as Record<string, unknown>;
      const maybeFn: unknown = flagsObj[def.descriptionKey];
      const flagFn: OptionalFlagDescriptionFn =
        typeof maybeFn === 'function' ? (maybeFn as OptionalFlagDescriptionFn) : undefined;
      const descResult: Result<Str> | undefined = flagFn?.();
      if (descResult && !descResult.ok) return descResult;
      description = descResult?.data ?? def.name;
    }
    helpFlags.push({
      short: def.short,
      long: def.long,
      description,
      ...(def.helpType ? { type: def.helpType } : {}),
      ...(def.default !== undefined ? { default: def.default } : {}),
      ...(def.scope === 'tool' ? { isTool: true } : {}),
    });
  }
  return ok(HelpFlagEntryArraySchema, helpFlags);
}

/**
 * Standard help flags for commands (subset of runner flags, plus tool-scope flags).
 * Used by `createCommand`. Excludes `--silent` (command help omits it).
 *
 * @param flagDefs - All flag definitions (filters by scope internally).
 * @param cliStrings - CLI framework locale strings for descriptions.
 * @param toolFlagDescriptions - Tool locale flag descriptions keyed by descriptionKey (for tool-scope flags).
 * @returns `Result<HelpFlagEntry[]>` — array of command help flags, or a validation error.
 */
export function buildCommandHelpFlags(
  flagDefs: readonly FlagDefinition[],
  cliStrings: BuiltCliStrings,
  toolFlagDescriptions?: OptionalToolFlagDescriptions,
): Result<HelpFlagEntry[]> {
  const flagDefsResult: Result<FlagDefinition[]> = safeParse(FlagDefinitionArraySchema, flagDefs);
  if (!flagDefsResult.ok) return flagDefsResult;
  const stringsResult: Result<BuiltCliStrings> = safeParse(BuiltCliStringsSchema, cliStrings);
  if (!stringsResult.ok) return stringsResult;
  const descriptionsResult: Result<OptionalToolFlagDescriptions> = safeParse(
    OptionalToolFlagDescriptionsSchema,
    toolFlagDescriptions,
  );
  if (!descriptionsResult.ok) return descriptionsResult;

  const commandDefs: readonly FlagDefinition[] = flagDefsResult.data.filter(
    (d: FlagDefinition): Bool =>
      (d.scope === 'command' || d.scope === 'tool') && d.name !== 'silent',
  );
  const result: Result<HelpFlagEntry[]> = buildStandardHelpFlags(
    commandDefs,
    stringsResult.data,
    descriptionsResult.data,
  );
  if (!result.ok) return result;
  return ok(HelpFlagEntryArraySchema, result.data);
}

// =============================================================================
// Help Rendering
// =============================================================================

/**
 * Renders the complete help screen to stdout.
 *
 * Prints header, usage, options (standard + tool), examples, and exit codes.
 * All styling uses `{tag}...{/}` inline markup. `padRight` calls are checked for `.ok` before use.
 *
 * @param name - Tool display name (already resolved from locale).
 * @param description - Tool description (already resolved from locale).
 * @param usage - Usage line (e.g., `pnpm tsx format.ts [options] [files...]`).
 * @param flags - Help flag definitions to display.
 * @param examples - Example usages with descriptions.
 * @param version - Version string.
 * @param exitCodes - Exit codes documentation.
 * @param strings - CLI framework locale strings for section headers.
 * @returns `Result<Void>` — success, or a validation error.
 */
function renderHelp(
  name: Str,
  description: Str,
  usage: Str,
  flags: HelpFlagEntry[],
  examples: ExampleDefinition[],
  version: Str,
  exitCodes: ExitCodeDefinition[],
  strings: BuiltCliStrings,
): Result<Void> {
  const nameResult: Result<Str> = safeParse(StrSchema, name);
  if (!nameResult.ok) return nameResult;
  const descriptionResult: Result<Str> = safeParse(StrSchema, description);
  if (!descriptionResult.ok) return descriptionResult;
  const usageResult: Result<Str> = safeParse(StrSchema, usage);
  if (!usageResult.ok) return usageResult;
  const versionResult: Result<Str> = safeParse(StrSchema, version);
  if (!versionResult.ok) return versionResult;
  const stringsResult: Result<BuiltCliStrings> = safeParse(BuiltCliStringsSchema, strings);
  if (!stringsResult.ok) return stringsResult;
  for (const f of flags) {
    const flagResult: Result<HelpFlagEntry> = safeParse(HelpFlagEntrySchema, f);
    if (!flagResult.ok) return flagResult;
  }
  for (const e of examples) {
    const exResult: Result<ExampleDefinition> = safeParse(ExampleDefinitionSchema, e);
    if (!exResult.ok) return exResult;
  }
  for (const ec of exitCodes) {
    const ecResult: Result<ExitCodeDefinition> = safeParse(ExitCodeDefinitionSchema, ec);
    if (!ecResult.ok) return ecResult;
  }

  // Get localized section headers
  const usageHeaderResult = stringsResult.data.output.usageHeader();
  if (!usageHeaderResult.ok) return usageHeaderResult;
  const usageHeader: Str = usageHeaderResult.data;
  const optionsHeaderResult = stringsResult.data.output.optionsHeader();
  if (!optionsHeaderResult.ok) return optionsHeaderResult;
  const optionsHeader: Str = optionsHeaderResult.data;
  const toolOptionsHeaderResult = stringsResult.data.output.toolOptionsHeader();
  if (!toolOptionsHeaderResult.ok) return toolOptionsHeaderResult;
  const toolOptionsHeader: Str = toolOptionsHeaderResult.data;
  const examplesHeaderResult = stringsResult.data.output.examplesHeader();
  if (!examplesHeaderResult.ok) return examplesHeaderResult;
  const examplesHeader: Str = examplesHeaderResult.data;
  const exitCodesHeaderResult = stringsResult.data.output.exitCodesHeader();
  if (!exitCodesHeaderResult.ok) return exitCodesHeaderResult;
  const exitCodesHeader: Str = exitCodesHeaderResult.data;
  const typeHintValueResult = stringsResult.data.output.typeHintValue();
  if (!typeHintValueResult.ok) return typeHintValueResult;
  const typeHintValue: Str = typeHintValueResult.data;
  const typeHintNumberResult = stringsResult.data.output.typeHintNumber();
  if (!typeHintNumberResult.ok) return typeHintNumberResult;
  const typeHintNumber: Str = typeHintNumberResult.data;

  // Print header
  log.raw('');
  if (versionResult.data) {
    log.raw(`{bold}${nameResult.data}{/} {dim}v${versionResult.data}{/}`);
  } else {
    log.raw(`{bold}${nameResult.data}{/}`);
  }
  log.raw(`{dim}${descriptionResult.data}{/}`);
  log.raw('');

  // Usage
  log.raw(`{bold}${usageHeader}{/}`);
  log.raw(`  ${usageResult.data}`);
  log.raw('');

  // Separate standard and tool-specific flags
  const standardFlags: HelpFlagEntry[] = flags.filter((f: HelpFlagEntry): Bool => !f.isTool);
  const toolFlags: HelpFlagEntry[] = flags.filter((f: HelpFlagEntry): Bool => f.isTool === true);

  // Helper to print a single flag
  const printFlag = (flag: HelpFlagEntry): Result<Void> => {
    const shortPart: Str = flag.short ? `${flag.short}, ` : '    ';
    const longPartResult: Result<Str> = padRight(flag.long, 18);
    if (!longPartResult.ok) return longPartResult;
    const longPart: Str = longPartResult.data;
    const typeHint: Str =
      flag.type === 'string'
        ? ` ${typeHintValue}`
        : flag.type === 'number'
          ? ` ${typeHintNumber}`
          : '';
    log.raw(`  ${shortPart}${longPart}${typeHint}  {dim}${flag.description}{/}`);
    return ok(VoidSchema, undefined);
  };

  // Standard options
  log.raw(`{bold}${optionsHeader}{/}`);
  for (const flag of standardFlags) {
    const flagPrintResult: Result<Void> = printFlag(flag);
    if (!flagPrintResult.ok) return flagPrintResult;
  }

  // Tool-specific options (only if there are any)
  if (toolFlags.length > 0) {
    log.raw('');
    log.raw(`{bold}${toolOptionsHeader}{/}`);
    for (const flag of toolFlags) {
      const flagPrintResult: Result<Void> = printFlag(flag);
      if (!flagPrintResult.ok) return flagPrintResult;
    }
  }

  // Examples with improved formatting
  if (examples.length > 0) {
    log.raw('');
    log.raw(`{bold}${examplesHeader}{/}`);
    log.raw('');
    for (const example of examples) {
      log.raw(`  ${example.description}:`);
      log.raw(`    {dim}${'$'}{/} ${example.command}`);
      log.raw('');
    }
  }

  // Exit codes
  if (exitCodes.length > 0) {
    log.raw(`{bold}${exitCodesHeader}{/}`);
    for (const exitCode of exitCodes) {
      const codeStr: Str = String(exitCode.code);
      const codePadResult: Result<Str> = padRight(codeStr, 4);
      if (!codePadResult.ok) return codePadResult;
      log.raw(`  ${codePadResult.data} {dim}${exitCode.description}{/}`);
    }
    log.raw('');
  }

  return ok(VoidSchema, undefined);
}

// =============================================================================
// Flag Definitions
// =============================================================================

/**
 * Help and version flag definitions.
 *
 * - `--help` / `-h`: Print help screen and exit (order 30).
 * - `--version` / `-V`: Print version and exit (order 40).
 *
 * Both handlers return `{ kind: 'exit', code: 0 }` to abort the handler chain.
 * Self-check: each handler returns `null` (continue) if its flag is not active.
 */
const defs: readonly FlagDefinition[] = [
  {
    name: 'help',
    property: 'help',
    long: '--help',
    short: '-h',
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'help',
    order: 30,
    /**
     * Builds help flags via `config.help.standardFlagsBuilder` and renders
     * the complete help screen, then aborts the handler chain.
     *
     * @param config - Standard flags configuration.
     * @returns `Result<NullableStandardFlagsResult>` — exit(0) or null to continue.
     */
    handle: (
      config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => {
      if (!config.flags.help) return ok(NullableStandardFlagsResultSchema, null);

      const nameResult: Result<Str> = config.toolStrings.name();
      if (!nameResult.ok) return nameResult;
      const name: Str = nameResult.data;
      const descResult: Result<Str> = config.toolStrings.description();
      if (!descResult.ok) return descResult;
      const description: Str = descResult.data;

      const helpFlagsResult: Result<HelpFlagEntry[]> = config.help.standardFlagsBuilder(
        config.cliStrings,
        config.toolStrings.flags,
      );
      if (!helpFlagsResult.ok) return helpFlagsResult;

      const pmExecResult: Result<Str> = getPmExec();
      if (!pmExecResult.ok) return pmExecResult;
      const pmExec: Str = pmExecResult.data;

      const renderResult: Result<Void> = renderHelp(
        name,
        description,
        `${pmExec} tsx ${config.definitionId}.ts ${config.help.usageSuffix}`,
        helpFlagsResult.data,
        config.toolStrings.examples,
        config.definitionVersion,
        config.toolStrings.exitCodes,
        config.cliStrings,
      );
      if (!renderResult.ok) return renderResult;

      return ok(StandardFlagsResultSchema, { kind: 'exit', code: 0 });
    },
  },
  {
    name: 'version',
    property: 'version',
    long: '--version',
    short: '-V',
    type: 'boolean',
    scope: 'command',
    schema: BoolSchema,
    descriptionKey: 'version',
    order: 40,
    /**
     * Prints version and aborts the handler chain.
     *
     * @param config - Standard flags configuration.
     * @returns `Result<NullableStandardFlagsResult>` — exit(0) or null to continue.
     */
    handle: (
      config: StandardFlagsConfig<BaseLocaleStrings>,
    ): Result<NullableStandardFlagsResult> => {
      if (!config.flags.version) return ok(NullableStandardFlagsResultSchema, null);

      const nameResult: Result<Str> = config.toolStrings.name();
      if (!nameResult.ok) return nameResult;

      log.raw(`${nameResult.data} v${config.definitionVersion}`);

      return ok(StandardFlagsResultSchema, { kind: 'exit', code: 0 });
    },
  },
];

export default defs;
