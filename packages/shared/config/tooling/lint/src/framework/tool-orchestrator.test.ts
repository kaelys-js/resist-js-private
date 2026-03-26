/**
 * Tests for the External Tool Orchestrator.
 *
 * Tests the ToolRegistry, pattern matching, and tool execution logic.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { LintResult } from './types.ts';
import {
  ToolRegistry,
  matchesPattern,
  isCommandAvailable,
  type ExternalTool,
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
    const registry: ToolRegistry = new ToolRegistry();
    const tool: ExternalTool = createMockTool();
    registry.register(tool);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('registers multiple tools', () => {
    const registry: ToolRegistry = new ToolRegistry();
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
    const registry: ToolRegistry = new ToolRegistry();
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
    const registry: ToolRegistry = new ToolRegistry();
    registry.register(createMockTool({ name: 'sh-tool', filePatterns: ['**/*.sh'] }));

    const tools: ExternalTool[] = registry.getToolsForFile('/path/to/file.ts');
    expect(tools).toHaveLength(0);
  });

  it('returns multiple tools when several match', () => {
    const registry: ToolRegistry = new ToolRegistry();
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
    const registry: ToolRegistry = new ToolRegistry();
    const tool: ExternalTool = createMockTool();
    const results: LintResult[] = await registry.runTool(tool, []);
    expect(results).toHaveLength(0);
  });

  it('skips tool when isAvailable returns false', async () => {
    const registry: ToolRegistry = new ToolRegistry();
    const tool: ExternalTool = createMockTool({
      isAvailable(): Promise<boolean> {
        return Promise.resolve(false);
      },
    });
    const results: LintResult[] = await registry.runTool(tool, ['/tmp/test.sh']);
    expect(results).toHaveLength(0);
  });

  it('runs tool and transforms output', async () => {
    const registry: ToolRegistry = new ToolRegistry();
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
