/**
 * End-to-end integration tests for the required-aware missing-tool pipeline.
 *
 * These tests exercise `ToolRegistry.runAll` and `runAllWorkspaceTools` with
 * mixed sets of required-missing, required-present, and optional-missing tools
 * to prove the `internal/tool-missing` diagnostic flows correctly through the
 * orchestrator end-to-end — no double emissions, no cross-pollination between
 * required and optional tools, and correct attribution (command, severity, file).
 *
 * Companion unit tests live in `tool-orchestrator.test.ts`; this file is the
 * integration-level contract.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { en } from '@/lint/locale/locales/en.ts';

import type { LintResult } from './types.ts';
import { ToolRegistry, type ExternalTool, type WorkspaceTool } from './tool-orchestrator.ts';

/* ---------- helpers ---------- */

/**
 * Build a minimal per-file tool with sensible defaults. Pattern matches any
 * `.ts` file so `runAll([...ts])` routes files to it.
 * @returns Description
 */
function makeExternalTool(overrides: Partial<ExternalTool> = {}): ExternalTool {
  return {
    name: 'mock-tool',
    command: 'mock-cmd',
    args: [],
    outputFormat: 'text',
    filePatterns: ['**/*.ts'],
    transform: (): LintResult[] => [],
    ...overrides,
  };
}

/** Build a minimal workspace-level tool with sensible defaults. */
function makeWorkspaceTool(overrides: Partial<WorkspaceTool> = {}): WorkspaceTool {
  return {
    name: 'mock-ws-tool',
    command: 'mock-ws-cmd',
    args: [],
    outputFormat: 'text',
    transform: (): LintResult[] => [],
    ...overrides,
  };
}

/* ---------- runAll: per-file integration ---------- */

describe('missing-tool pipeline — ToolRegistry.runAll (per-file)', () => {
  it('emits exactly one internal/tool-missing for a required-missing tool routed through runAll', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(
      makeExternalTool({
        command: 'required-missing-bin',
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAll(['/tmp/a.ts', '/tmp/b.ts', '/tmp/c.ts']);

    const missing: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-missing',
    );
    expect(missing).toHaveLength(1);
    expect(missing[0]?.severity).toBe('error');
    expect(missing[0]?.message).toContain("'required-missing-bin'");
    /* File attribution: first matching file from the routed batch. */
    expect(missing[0]?.file).toBe('/tmp/a.ts');
  });

  it('does not emit tool-missing when an optional (required=false) tool is missing', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(
      makeExternalTool({
        command: 'optional-missing-bin',
        required: false,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAll(['/tmp/a.ts']);
    expect(results).toEqual([]);
  });

  it('does not emit tool-missing when `required` is omitted (default silent-skip)', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(
      makeExternalTool({
        command: 'default-missing-bin',
        /* required intentionally omitted — legacy silent-skip behavior */
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAll(['/tmp/a.ts']);
    expect(results).toEqual([]);
  });

  it('mixes required-missing, required-present, and optional-missing without cross-pollution', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);

    /* Required + missing → one internal/tool-missing */
    registry.register(
      makeExternalTool({
        name: 'req-missing',
        command: 'req-missing-bin',
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    /* Required + present → runs and transforms output; do not call a real
     * binary — stub isAvailable=true and override transform to emit a finding
     * directly. To avoid execFileSync, we use `echo` which is universally
     * available, and produce output via the transform stage. */
    registry.register(
      makeExternalTool({
        name: 'req-present',
        command: 'echo',
        args: ['ok'],
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(true);
        },
        transform: (): LintResult[] => [
          {
            ruleId: 'req-present/finding',
            file: '/tmp/a.ts',
            line: 42,
            column: 3,
            severity: 'warning',
            message: 'present tool ran',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ],
      }),
    );

    /* Optional + missing → silent, no output */
    registry.register(
      makeExternalTool({
        name: 'opt-missing',
        command: 'opt-missing-bin',
        required: false,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAll(['/tmp/a.ts']);

    /* Partition by ruleId class and assert exact counts. */
    const missing: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-missing',
    );
    const present: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'req-present/finding',
    );
    const crashes: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-crash',
    );

    expect(missing).toHaveLength(1);
    expect(missing[0]?.message).toContain("'req-missing-bin'");

    expect(present).toHaveLength(1);
    expect(present[0]?.line).toBe(42);

    /* No silent-skip tool contributed anything. */
    expect(crashes).toHaveLength(0);
    expect(results).toHaveLength(2);
  });
});

/* ---------- runAllWorkspaceTools: workspace integration ---------- */

describe('missing-tool pipeline — ToolRegistry.runAllWorkspaceTools', () => {
  it('emits exactly one internal/tool-missing for a required-missing workspace tool', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        command: 'required-missing-ws-bin',
        cwd: '/tmp/workspace-root',
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAllWorkspaceTools();

    const missing: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-missing',
    );
    expect(missing).toHaveLength(1);
    expect(missing[0]?.severity).toBe('error');
    expect(missing[0]?.message).toContain("'required-missing-ws-bin'");
    expect(missing[0]?.file).toBe('/tmp/workspace-root');
  });

  it('does not emit tool-missing when an optional workspace tool is missing', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        command: 'optional-ws-missing-bin',
        required: false,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAllWorkspaceTools();
    expect(results).toEqual([]);
  });

  it('mixes required-missing, required-present, and optional-missing workspace tools', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);

    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        name: 'ws-req-missing',
        command: 'ws-req-missing-bin',
        cwd: '/tmp/ws',
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        name: 'ws-req-present',
        command: 'echo',
        args: ['ws-ok'],
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(true);
        },
        transform: (): LintResult[] => [
          {
            ruleId: 'ws-req-present/finding',
            file: '/tmp/ws',
            line: 1,
            column: 1,
            severity: 'warning',
            message: 'workspace tool ran',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ],
      }),
    );

    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        name: 'ws-opt-missing',
        command: 'ws-opt-missing-bin',
        required: false,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAllWorkspaceTools();

    const missing: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-missing',
    );
    const present: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'ws-req-present/finding',
    );
    const crashes: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-crash',
    );

    expect(missing).toHaveLength(1);
    expect(missing[0]?.message).toContain("'ws-req-missing-bin'");
    expect(missing[0]?.file).toBe('/tmp/ws');

    expect(present).toHaveLength(1);
    expect(crashes).toHaveLength(0);
    expect(results).toHaveLength(2);
  });

  it('aggregates multiple required-missing workspace tools without merging them', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);

    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        name: 'ws-a',
        command: 'ws-a-bin',
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );
    registry.registerWorkspaceTool(
      makeWorkspaceTool({
        name: 'ws-b',
        command: 'ws-b-bin',
        required: true,
        isAvailable(): Promise<boolean> {
          return Promise.resolve(false);
        },
      }),
    );

    const results: LintResult[] = await registry.runAllWorkspaceTools();

    const missing: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-missing',
    );
    expect(missing).toHaveLength(2);
    const commands: string[] = missing
      .map((r: LintResult): string => r.message)
      .toSorted((a: string, b: string): number => a.localeCompare(b));
    expect(commands[0]).toContain("'ws-a-bin'");
    expect(commands[1]).toContain("'ws-b-bin'");
  });
});
