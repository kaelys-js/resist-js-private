/**
 * Tests for the External Tool Orchestrator.
 *
 * Tests the ToolRegistry, pattern matching, and tool execution logic.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { en } from '@/lint/locale/locales/en.ts';

import type { LintResult } from './types.ts';
import {
  ToolRegistry,
  matchesPattern,
  isCommandAvailable,
  type ExternalTool,
  type WorkspaceTool,
} from './tool-orchestrator.ts';

// =============================================================================
// matchesPattern
// =============================================================================

describe('matchesPattern', () => {
  it('matches **/*.ext patterns', () => {
    expect(matchesPattern('/path/to/script.sh', '**/*.sh')).toBe(true);
    expect(matchesPattern('src/file.ts', '**/*.ts')).toBe(true);
  });

  it('does not match wrong extension with **/*.ext', () => {
    expect(matchesPattern('/path/to/file.ts', '**/*.sh')).toBe(false);
  });

  it('matches *.ext patterns', () => {
    expect(matchesPattern('/path/to/file.yaml', '*.yaml')).toBe(true);
  });

  it('matches exact filename patterns', () => {
    expect(matchesPattern('/path/to/Dockerfile', 'Dockerfile')).toBe(true);
    expect(matchesPattern('Dockerfile', 'Dockerfile')).toBe(true);
  });

  it('does not match different filenames', () => {
    expect(matchesPattern('/path/to/README.md', 'Dockerfile')).toBe(false);
  });

  it('matches prefix wildcard patterns', () => {
    expect(matchesPattern('/path/to/Dockerfile.prod', 'Dockerfile*')).toBe(true);
    expect(matchesPattern('/path/to/Dockerfile', 'Dockerfile*')).toBe(true);
  });

  it('does not match non-prefix files with prefix pattern', () => {
    expect(matchesPattern('/path/to/myDockerfile', 'Dockerfile*')).toBe(false);
  });
});

// =============================================================================
// ToolRegistry — registration
// =============================================================================

/**
 * Create a minimal mock tool for testing.
 *
 * @param overrides - Optional partial overrides for the mock tool
 * @returns A complete ExternalTool instance with defaults
 */
function createMockTool(overrides?: Partial<ExternalTool>): ExternalTool {
  return {
    name: 'mock-tool',
    command: 'echo',
    args: ['test'],
    outputFormat: 'text',
    filePatterns: ['**/*.sh'],
    transform: (): LintResult[] => [],
    ...overrides,
  };
}

describe('ToolRegistry — registration', () => {
  it('registers a tool', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: ExternalTool = createMockTool();
    registry.register(tool);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('registers multiple tools', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(createMockTool({ name: 'tool-a' }));
    registry.register(createMockTool({ name: 'tool-b' }));
    expect(registry.getAll()).toHaveLength(2);
  });
});

// =============================================================================
// ToolRegistry — getToolsForFile
// =============================================================================

describe('ToolRegistry — getToolsForFile', () => {
  it('returns matching tools for a file', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(createMockTool({ name: 'sh-tool', filePatterns: ['**/*.sh'] }));
    registry.register(createMockTool({ name: 'md-tool', filePatterns: ['**/*.md'] }));

    const shTools: ExternalTool[] = registry.getToolsForFile('/path/to/script.sh');
    expect(shTools).toHaveLength(1);
    expect(shTools[0]?.name).toBe('sh-tool');

    const mdTools: ExternalTool[] = registry.getToolsForFile('/path/to/README.md');
    expect(mdTools).toHaveLength(1);
    expect(mdTools[0]?.name).toBe('md-tool');
  });

  it('returns empty array when no tools match', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(createMockTool({ name: 'sh-tool', filePatterns: ['**/*.sh'] }));

    const tools: ExternalTool[] = registry.getToolsForFile('/path/to/file.ts');
    expect(tools).toHaveLength(0);
  });

  it('returns multiple tools when several match', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.register(createMockTool({ name: 'tool-a', filePatterns: ['**/*.sh'] }));
    registry.register(createMockTool({ name: 'tool-b', filePatterns: ['**/*.sh', '**/*.bash'] }));

    const tools: ExternalTool[] = registry.getToolsForFile('/path/to/script.sh');
    expect(tools).toHaveLength(2);
  });
});

// =============================================================================
// ToolRegistry — runTool
// =============================================================================

describe('ToolRegistry — runTool', () => {
  it('returns empty results for empty file list', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: ExternalTool = createMockTool();
    const results: LintResult[] = await registry.runTool(tool, []);
    expect(results).toHaveLength(0);
  });

  it('skips optional tool when isAvailable returns false', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: ExternalTool = createMockTool({
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
    });
    const results: LintResult[] = await registry.runTool(tool, ['/tmp/test.sh']);
    expect(results).toHaveLength(0);
  });

  it('skips optional tool (required=false) when isAvailable returns false', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: ExternalTool = createMockTool({
      required: false,
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
    });
    const results: LintResult[] = await registry.runTool(tool, ['/tmp/test.sh']);
    expect(results).toHaveLength(0);
  });

  it('emits internal/tool-missing when required tool is unavailable', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: ExternalTool = createMockTool({
      command: 'nonexistent-required-tool',
      required: true,
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
    });
    const results: LintResult[] = await registry.runTool(tool, ['/tmp/test.sh']);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-missing');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'nonexistent-required-tool'");
    expect(results[0]?.file).toBe('/tmp/test.sh');
  });

  it('runs tool and transforms output', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: ExternalTool = createMockTool({
      command: 'echo',
      args: ['hello'],
      transform: (output: string): LintResult[] => {
        if (output.trim().length > 0) {
          return [
            {
              ruleId: 'test/rule',
              file: 'test.sh',
              line: 1,
              column: 1,
              severity: 'warning',
              message: 'test message',
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        }
        return [];
      },
    });

    const results: LintResult[] = await registry.runTool(tool, ['/tmp/test.sh']);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('test/rule');
  });
});

// =============================================================================
// isCommandAvailable
// =============================================================================

describe('isCommandAvailable', () => {
  it('returns true for a known command (echo)', async () => {
    const available: boolean = await isCommandAvailable('echo');
    expect(available).toBe(true);
  });

  it('returns false for a nonexistent command', async () => {
    const available: boolean = await isCommandAvailable('definitely_not_a_real_command_xyz');
    expect(available).toBe(false);
  });
});

// =============================================================================
// Phase 51 — Tool crash diagnostic emission
// =============================================================================

describe('Phase 51 — tool crash diagnostic', () => {
  it('emits internal/tool-crash when a file tool crashes without stdout', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const crashingTool: ExternalTool = createMockTool({
      name: 'crash-tool',
      command: 'definitely_not_a_real_command_xyz_crash',
      args: [],
      filePatterns: ['**/*.ts'],
    });

    const results: LintResult[] = await registry.runTool(crashingTool, ['/tmp/test.ts']);
    const crashes: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-crash',
    );
    expect(crashes.length).toBe(1);
    expect(crashes[0]?.severity).toBe('error');
    expect(crashes[0]?.message).toContain("'definitely_not_a_real_command_xyz_crash'");
    expect(crashes[0]?.message).toContain('crashed');
  });

  it('does not emit tool-crash when tool succeeds', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const goodTool: ExternalTool = createMockTool({
      name: 'echo-tool',
      command: 'echo',
      args: ['hello'],
      filePatterns: ['**/*.ts'],
      transform: (): LintResult[] => [],
    });

    const results: LintResult[] = await registry.runTool(goodTool, ['/tmp/test.ts']);
    const crashes: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-crash',
    );
    expect(crashes.length).toBe(0);
  });
});

// =============================================================================
// ToolRegistry — workspace tools
// =============================================================================

/**
 * Create a minimal mock workspace tool for testing.
 *
 * @param overrides - Optional partial overrides
 * @returns A complete WorkspaceTool instance with defaults
 */
function createMockWorkspaceTool(overrides?: Partial<WorkspaceTool>): WorkspaceTool {
  return {
    name: 'mock-ws-tool',
    command: 'echo',
    args: ['ws-output'],
    outputFormat: 'text',
    transform: (): LintResult[] => [],
    ...overrides,
  };
}

describe('ToolRegistry — workspace tool registration', () => {
  it('registers and retrieves workspace tools', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool();
    registry.registerWorkspaceTool(tool);
    expect(registry.getAllWorkspaceTools()).toHaveLength(1);
    expect(registry.getAllWorkspaceTools()[0]?.name).toBe('mock-ws-tool');
  });

  it('registers multiple workspace tools', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    registry.registerWorkspaceTool(createMockWorkspaceTool({ name: 'ws-a' }));
    registry.registerWorkspaceTool(createMockWorkspaceTool({ name: 'ws-b' }));
    expect(registry.getAllWorkspaceTools()).toHaveLength(2);
  });

  it('returns empty array when no workspace tools registered', () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    expect(registry.getAllWorkspaceTools()).toHaveLength(0);
  });
});

describe('ToolRegistry — runWorkspaceTool', () => {
  it('runs workspace tool and transforms output', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      transform: (output: string): LintResult[] => {
        if (output.trim().length > 0) {
          return [
            {
              ruleId: 'ws/check',
              file: 'workspace',
              line: 1,
              column: 1,
              severity: 'warning',
              message: output.trim(),
              fix: { range: { start: 0, end: 0 }, text: '' },
            },
          ];
        }
        return [];
      },
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toBe('ws-output');
  });

  it('skips optional workspace tool when isAvailable returns false', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
      transform: (): LintResult[] => [
        {
          ruleId: 'ws/never',
          file: 'x',
          line: 1,
          column: 1,
          severity: 'error',
          message: 'should not run',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(0);
  });

  it('emits internal/tool-missing when required workspace tool is unavailable', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      command: 'nonexistent-required-ws-tool',
      cwd: '/tmp/ws-project',
      required: true,
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-missing');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'nonexistent-required-ws-tool'");
    expect(results[0]?.file).toBe('/tmp/ws-project');
  });

  it('skips optional workspace tool (required=false) when unavailable', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      required: false,
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(0);
  });

  it('runs workspace tool when isAvailable returns true', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      isAvailable(): Promise<boolean> {
        return Promise.resolve(true);
      },
      transform: (output: string): LintResult[] => [
        {
          ruleId: 'ws/ok',
          file: 'workspace',
          line: 1,
          column: 1,
          severity: 'info' as LintResult['severity'],
          message: output.trim(),
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ws/ok');
  });

  it('runs workspace tool with no isAvailable check', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      transform: (): LintResult[] => [
        {
          ruleId: 'ws/no-check',
          file: 'workspace',
          line: 1,
          column: 1,
          severity: 'warning',
          message: 'ran',
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ws/no-check');
  });

  it('emits tool-crash when workspace tool command not found', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      command: 'definitely_not_a_real_workspace_command_xyz',
      args: [],
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('internal/tool-crash');
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'definitely_not_a_real_workspace_command_xyz'");
    expect(results[0]?.message).toContain('crashed');
  });

  it('captures stdout from workspace tool that exits non-zero', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      command: 'node',
      args: ['-e', "process.stdout.write('error-output'); process.exit(1)"],
      transform: (output: string): LintResult[] => [
        {
          ruleId: 'ws/error',
          file: 'workspace',
          line: 1,
          column: 1,
          severity: 'error',
          message: output,
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('ws/error');
    expect(results[0]?.message).toBe('error-output');
  });

  it('uses custom cwd for workspace tool', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      command: 'pwd',
      args: [],
      cwd: '/tmp',
      transform: (output: string): LintResult[] => [
        {
          ruleId: 'ws/cwd',
          file: 'workspace',
          line: 1,
          column: 1,
          severity: 'warning',
          message: output.trim(),
          fix: { range: { start: 0, end: 0 }, text: '' },
        },
      ],
    });
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    expect(results[0]?.message).toMatch(/\/tmp/);
  });

  it('uses process.cwd() when tool has no cwd', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const tool: WorkspaceTool = createMockWorkspaceTool({
      command: 'pwd',
      args: [],
    });
    /* No crash = used a valid cwd (process.cwd()) */
    const results: LintResult[] = await registry.runWorkspaceTool(tool);
    const crashes: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-crash',
    );
    expect(crashes).toHaveLength(0);
  });
});

describe('ToolRegistry — runAllWorkspaceTools', () => {
  it('returns empty array when no workspace tools registered', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);
    const results: LintResult[] = await registry.runAllWorkspaceTools();
    expect(results).toHaveLength(0);
  });

  it('aggregates results from multiple workspace tools', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);

    const makeResult = (id: string): LintResult => ({
      ruleId: id,
      file: 'workspace',
      line: 1,
      column: 1,
      severity: 'warning',
      message: id,
      fix: { range: { start: 0, end: 0 }, text: '' },
    });

    registry.registerWorkspaceTool(
      createMockWorkspaceTool({
        name: 'tool-a',
        transform: (): LintResult[] => [makeResult('a/rule')],
      }),
    );
    registry.registerWorkspaceTool(
      createMockWorkspaceTool({
        name: 'tool-b',
        transform: (): LintResult[] => [makeResult('b/rule')],
      }),
    );

    const results: LintResult[] = await registry.runAllWorkspaceTools();
    expect(results).toHaveLength(2);
    const ruleIds: string[] = results.map((r: LintResult): string => r.ruleId);
    expect(ruleIds).toContain('a/rule');
    expect(ruleIds).toContain('b/rule');
  });

  it('includes crash diagnostics from failing workspace tools alongside successes', async () => {
    const registry: ToolRegistry = new ToolRegistry(en);

    registry.registerWorkspaceTool(
      createMockWorkspaceTool({
        name: 'good-tool',
        transform: (): LintResult[] => [
          {
            ruleId: 'ws/good',
            file: 'workspace',
            line: 1,
            column: 1,
            severity: 'warning',
            message: 'ok',
            fix: { range: { start: 0, end: 0 }, text: '' },
          },
        ],
      }),
    );
    registry.registerWorkspaceTool(
      createMockWorkspaceTool({
        name: 'crash-tool',
        command: 'nonexistent_crash_cmd_xyz',
        args: [],
      }),
    );

    const results: LintResult[] = await registry.runAllWorkspaceTools();
    expect(results.length).toBeGreaterThanOrEqual(2);
    const goodResults: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'ws/good',
    );
    const crashes: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'internal/tool-crash',
    );
    expect(goodResults).toHaveLength(1);
    expect(crashes).toHaveLength(1);
  });
});
