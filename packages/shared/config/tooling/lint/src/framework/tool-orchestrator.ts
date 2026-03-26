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

import * as v from 'valibot';

import type { LintResult } from '@/lint/framework/types.ts';

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
  /** Transform raw tool output into LintResult[]. */
  transform: v.custom<(output: string) => LintResult[]>(isFn),
  /** Optional check if the tool is available on the system (sync or async). */
  isAvailable: v.optional(v.custom<() => boolean | Promise<boolean>>(isFn)),
});

/** An external tool definition. See {@link ExternalToolSchema}. */
export type ExternalTool = v.InferOutput<typeof ExternalToolSchema>;

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
  /** All registered tools. */
  private readonly tools: ExternalTool[] = [];

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
   * If the tool has an `isAvailable` check and it returns false,
   * the tool is skipped silently.
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
        return [];
      }
    }

    try {
      const output: string = execFileSync(tool.command, [...tool.args, ...files], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 60_000,
      });

      return tool.transform(output);
    } catch (error: unknown) {
      /* Many lint tools exit non-zero when they find issues — capture stdout */
      const execError = error as { stdout?: string; status?: number };
      if (execError.stdout && typeof execError.stdout === 'string') {
        return tool.transform(execError.stdout);
      }
      return [];
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
 * Check if a command is available on the system.
 *
 * @param {string} command - Command to check
 * @returns {boolean} Whether the command is available
 */
export function isCommandAvailable(command: string): boolean {
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
