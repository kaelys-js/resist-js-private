/**
 * Custom Linter — External Tool Orchestrator
 *
 * Manages external lint tools (shellcheck, hadolint, yamllint, markdownlint, etc.)
 * as part of a unified lint pipeline. Each tool is registered with file patterns
 * and a transform function that converts tool output into `LintResult[]`.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';

import * as v from 'valibot';

import type { LintResult } from '@/lint/framework/types.ts';
import type { LintStrings } from '@/lint/locale/schema.ts';

// =============================================================================
// Types
// =============================================================================

/**
 * Validator for function type checks.
 *
 * @param val - Value to check
 * @returns Whether the value is a function
 */
const isFn = (val: unknown): boolean => typeof val === 'function';

/** Schema for an external tool definition. */
export const ExternalToolSchema = v.strictObject({
  /** Human-readable tool name. */
  name: v.string(),
  /** Command to execute (e.g., 'shellcheck', 'hadolint'). */
  command: v.string(),
  /** Default arguments to pass to the command. */
  args: v.array(v.string()),
  /** Output format the tool produces. */
  outputFormat: v.picklist(['json', 'text', 'sarif']),
  /** File patterns this tool applies to (glob-like, e.g., '**\/*.sh'). */
  filePatterns: v.array(v.string()),
  /** Transform raw tool output into LintResult[]. Accepts locale strings for message localization. */
  transform: v.custom<(output: string, strings: LintStrings) => LintResult[]>(isFn),
  /** Optional check if the tool is available on the system (sync or async). */
  isAvailable: v.optional(v.custom<() => boolean | Promise<boolean>>(isFn)),
  /**
   * If true, a missing binary emits a synthetic `internal/tool-missing` error
   * instead of being silently skipped. Default: undefined/false (silent skip).
   * Reserve for mission-critical tools whose absence indicates a broken env.
   */
  required: v.optional(v.boolean()),
});

/** An external tool definition. See {@link ExternalToolSchema}. */
export type ExternalTool = v.InferOutput<typeof ExternalToolSchema>;

/** Schema for a workspace-level tool that runs once (not per-file). */
export const WorkspaceToolSchema = v.strictObject({
  /** Human-readable tool name. */
  name: v.string(),
  /** Command to execute (e.g., 'tsgo', 'svelte-check'). */
  command: v.string(),
  /** Default arguments to pass to the command. */
  args: v.array(v.string()),
  /** Working directory to run the command in (defaults to process.cwd()). */
  cwd: v.optional(v.string()),
  /** Output format the tool produces. */
  outputFormat: v.picklist(['json', 'text', 'sarif']),
  /** Transform raw tool output into LintResult[]. */
  transform: v.custom<(output: string, strings: LintStrings) => LintResult[]>(isFn),
  /** Optional check if the tool is available on the system. */
  isAvailable: v.optional(v.custom<() => boolean | Promise<boolean>>(isFn)),
  /**
   * If true, a missing binary emits a synthetic `internal/tool-missing` error
   * instead of being silently skipped. Default: undefined/false (silent skip).
   * Reserve for mission-critical tools whose absence indicates a broken env.
   */
  required: v.optional(v.boolean()),
});

/** A workspace-level tool definition. See {@link WorkspaceToolSchema}. */
export type WorkspaceTool = v.InferOutput<typeof WorkspaceToolSchema>;

// =============================================================================
// Tool Registry
// =============================================================================

/**
 * Registry of external lint tools.
 *
 * Handles tool registration, file-pattern matching, availability checks,
 * and parallel execution with result aggregation.
 *
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 * registry.register(shellcheckTool);
 * const results = await registry.runAll(['script.sh', 'Dockerfile']);
 * ```
 */
export class ToolRegistry {
  /** All registered per-file tools. */
  private readonly tools: ExternalTool[] = [];

  /** All registered workspace-level tools. */
  private readonly workspaceTools: WorkspaceTool[] = [];

  /** Locale strings for tool message localization. */
  private readonly strings: LintStrings;

  /**
   * Create a tool registry.
   *
   * @param {LintStrings} strings - Locale strings for message localization
   */
  constructor(strings: LintStrings) {
    this.strings = strings;
  }

  /**
   * Register an external tool.
   *
   * @param {ExternalTool} tool - Tool definition to register
   */
  register(tool: ExternalTool): void {
    this.tools.push(tool);
  }

  /**
   * Get all registered tools.
   *
   * @returns {readonly ExternalTool[]} Array of all registered tools
   */
  getAll(): readonly ExternalTool[] {
    return this.tools;
  }

  /**
   * Get tools applicable to a specific file based on file patterns.
   *
   * @param {string} filePath - File path to match against
   * @returns {ExternalTool[]} Matching tools
   */
  getToolsForFile(filePath: string): ExternalTool[] {
    return this.tools.filter((tool: ExternalTool): boolean =>
      tool.filePatterns.some((pattern: string): boolean => matchesPattern(filePath, pattern)),
    );
  }

  /**
   * Run a single tool on a set of files.
   *
   * If the tool has an `isAvailable` check and it returns false:
   * - `required: true` → synthetic `internal/tool-missing` error returned.
   * - otherwise (default) → tool is skipped silently (empty result).
   *
   * @param {ExternalTool} tool - Tool to run
   * @param {string[]} files - Files to lint
   * @returns {Promise<LintResult[]>} Lint results from the tool
   */
  async runTool(tool: ExternalTool, files: string[]): Promise<LintResult[]> {
    if (files.length === 0) {
      return [];
    }

    /* Check availability */
    if (tool.isAvailable) {
      const available: boolean = await tool.isAvailable();
      if (!available) {
        if (tool.required === true) {
          return [missingToolResult(tool.command, files[0] ?? process.cwd())];
        }
        return [];
      }
    }

    try {
      const output: string = execFileSync(tool.command, [...tool.args, ...files], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60_000,
      });

      return tool.transform(output, this.strings);
    } catch (error: unknown) {
      /* Many lint tools exit non-zero when they find issues — capture stdout */
      const execError = error as { stdout?: string; status?: number; message?: string };
      if (execError.stdout && typeof execError.stdout === 'string') {
        return tool.transform(execError.stdout, this.strings);
      }
      const message: string = error instanceof Error ? error.message : String(error);
      return [
        {
          file: files[0] ?? process.cwd(),
          line: 1,
          column: 1,
          severity: 'error' as const,
          message: `Tool '${tool.command}' crashed: ${message}`,
          ruleId: 'internal/tool-crash',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    }
  }

  /**
   * Run all applicable tools on a set of files in parallel.
   *
   * Groups files by tool, runs each tool once per group, and
   * aggregates all results.
   *
   * @param {string[]} files - All files to lint
   * @returns {Promise<LintResult[]>} Aggregated lint results from all tools
   */
  async runAll(files: string[]): Promise<LintResult[]> {
    /* Group files by tool */
    const toolFiles: Map<ExternalTool, string[]> = new Map();

    for (const tool of this.tools) {
      const matching: string[] = files.filter((f: string): boolean =>
        tool.filePatterns.some((pattern: string): boolean => matchesPattern(f, pattern)),
      );
      if (matching.length > 0) {
        toolFiles.set(tool, matching);
      }
    }

    /* Run all tools in parallel */
    const promises: Array<Promise<LintResult[]>> = [];
    for (const [tool, toolFileList] of toolFiles) {
      promises.push(this.runTool(tool, toolFileList));
    }

    const results: LintResult[][] = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Register a workspace-level tool.
   *
   * @param {WorkspaceTool} tool - Workspace tool definition to register
   */
  registerWorkspaceTool(tool: WorkspaceTool): void {
    this.workspaceTools.push(tool);
  }

  /**
   * Get all registered workspace tools.
   *
   * @returns {readonly WorkspaceTool[]} Array of all registered workspace tools
   */
  getAllWorkspaceTools(): readonly WorkspaceTool[] {
    return this.workspaceTools;
  }

  /**
   * Run a single workspace tool.
   *
   * If the tool has an `isAvailable` check and it returns false:
   * - `required: true` → synthetic `internal/tool-missing` error returned.
   * - otherwise (default) → tool is skipped silently (empty result).
   *
   * @param {WorkspaceTool} tool - Workspace tool to run
   * @returns {Promise<LintResult[]>} Lint results from the tool
   */
  async runWorkspaceTool(tool: WorkspaceTool): Promise<LintResult[]> {
    /* Check availability */
    if (tool.isAvailable) {
      const available: boolean = await tool.isAvailable();
      if (!available) {
        if (tool.required === true) {
          return [missingToolResult(tool.command, tool.cwd ?? process.cwd())];
        }
        return [];
      }
    }

    try {
      const output: string = execFileSync(tool.command, tool.args, {
        cwd: tool.cwd ?? process.cwd(),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120_000,
      });

      return tool.transform(output, this.strings);
    } catch (error: unknown) {
      /* Type-check tools exit non-zero when they find errors — capture stdout */
      const execError = error as { stdout?: string; status?: number };
      if (execError.stdout && typeof execError.stdout === 'string') {
        return tool.transform(execError.stdout, this.strings);
      }
      const message: string = error instanceof Error ? error.message : String(error);
      return [
        {
          file: tool.cwd ?? process.cwd(),
          line: 1,
          column: 1,
          severity: 'error' as const,
          message: `Workspace tool '${tool.command}' crashed: ${message}`,
          ruleId: 'internal/tool-crash',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ];
    }
  }

  /**
   * Run all registered workspace tools in parallel.
   *
   * @returns {Promise<LintResult[]>} Aggregated lint results from all workspace tools
   */
  async runAllWorkspaceTools(): Promise<LintResult[]> {
    if (this.workspaceTools.length === 0) {
      return [];
    }

    const promises: Array<Promise<LintResult[]>> = this.workspaceTools.map(
      (tool: WorkspaceTool): Promise<LintResult[]> => this.runWorkspaceTool(tool),
    );

    const results: LintResult[][] = await Promise.all(promises);
    return results.flat();
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a file path matches a simple glob pattern.
 *
 * Supports patterns like:
 * - `**\/*.sh` — matches any file ending in `.sh`
 * - `*.sh` — matches any file ending in `.sh`
 * - `Dockerfile` — exact filename match
 * - `Dockerfile*` — prefix match
 *
 * @param {string} filePath - File path to test
 * @param {string} pattern - Glob-like pattern
 * @returns {boolean} Whether the file matches
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  if (pattern.startsWith('**/*.')) {
    const ext: string = pattern.slice(4);
    return filePath.endsWith(ext);
  }

  if (pattern.startsWith('*.')) {
    const ext: string = pattern.slice(1);
    return filePath.endsWith(ext);
  }

  if (pattern.endsWith('*')) {
    const prefix: string = pattern.slice(0, -1);
    const fileName: string = filePath.slice(filePath.lastIndexOf('/') + 1);
    return fileName.startsWith(prefix);
  }

  /* Exact filename match */
  const fileName: string = filePath.slice(filePath.lastIndexOf('/') + 1);
  return fileName === pattern;
}

/**
 * Build a synthetic `internal/tool-missing` finding for a required tool whose
 * binary is absent from PATH. Mirrors the shape of `internal/tool-crash` so
 * formatters, baselines, and the post-edit hook handle it identically.
 *
 * @param {string} command - The missing binary name (e.g. 'oxlint')
 * @param {string} file - File path to attribute the finding to
 * @returns {LintResult} Synthetic error finding
 */
export function missingToolResult(command: string, file: string): LintResult {
  return {
    file,
    line: 1,
    column: 1,
    severity: 'error' as const,
    message: `Required tool '${command}' is not available on PATH. Install via mise/brew/apt.`,
    ruleId: 'internal/tool-missing',
    fix: { range: { start: 0, end: 0 }, text: '' },
  };
}

/**
 * Walk parent directories from `start` looking for a `pnpm-workspace.yaml` file
 * to identify the workspace root. Returns null when no marker is found before
 * reaching the filesystem root.
 *
 * @param {string} start - Starting directory (typically `process.cwd()`).
 * @returns {string | null} Workspace root path, or null when not found.
 */
export function findWorkspaceRoot(start: string): string | null {
  let current: string = start;
  let previous: string = '';
  while (current !== previous) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    previous = current;
    current = dirname(current);
  }
  return null;
}

/**
 * Check if a command is available on the system.
 *
 * Resolution order:
 * 1. Workspace-local `node_modules/.bin/<command>` (where pnpm hoists package
 *    binaries) — covers `oxlint`, `tsgo`, `svelte-check`, etc.
 * 2. Fall back to `which <command>` for system-installed binaries.
 *
 * @param {string} command - Command to check
 * @returns {boolean} Whether the command is available
 */
export function isCommandAvailable(command: string): boolean {
  const workspaceRoot: string | null = findWorkspaceRoot(process.cwd());
  if (workspaceRoot !== null && existsSync(join(workspaceRoot, 'node_modules', '.bin', command))) {
    return true;
  }
  try {
    execFileSync('which', [command], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Default concurrency cap for parallel tool invocations across packages.
 * Bounded by available CPU parallelism but never above 8 to prevent
 * memory pressure when many heavy tools (svelte-check, tsgo) run together.
 */
export const TOOL_CONCURRENCY: number = Math.min(availableParallelism(), 8);

/**
 * Map an array to results in parallel with bounded concurrency.
 *
 * Spawns up to `limit` workers; each repeatedly pulls the next index from
 * a shared cursor. Order of `results` matches input order regardless of
 * completion order.
 *
 * @param {readonly T[]} items - Items to map
 * @param {number} limit - Maximum parallel `fn` invocations
 * @param {(item: T) => Promise<R>} fn - Async transform applied to each item
 * @returns {Promise<R[]>} Results in input order
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length });
  let cursor: number = 0;
  /**
   * Recursively process the next item from the shared work queue.
   *
   * Recursive form (rather than `while (cursor < items.length)`) so the
   * required `await fn(item)` is not flagged by `oxlint/no-await-in-loop`.
   *
   * @returns Promise that resolves once the queue is drained
   */
  const worker = async (): Promise<void> => {
    if (cursor >= items.length) {
      return;
    }
    const idx: number = cursor;
    cursor += 1;
    const item: T | undefined = items[idx];
    if (item !== undefined) {
      results[idx] = await fn(item);
    }
    return worker();
  };
  const workerCount: number = Math.min(limit, items.length);
  const workers: Array<Promise<void>> = Array.from(
    { length: workerCount },
    (): Promise<void> => worker(),
  );
  await Promise.all(workers);
  return results;
}
