/**
 * Tests for generate-manifest.ts brand parsing logic.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';

import { parseBrandCommands } from './generate-manifest';

// =============================================================================
// Helpers
// =============================================================================

/** Minimal brand.ts source with template literal COMMANDS. */
function makeBrandSource(commandsBody: string, prefix = 'resist'): string {
  return `
export const COMMAND_PREFIX = '${prefix}';
export const COMMANDS = {
${commandsBody}
} as const;
`;
}

// =============================================================================
// Tests
// =============================================================================

describe('parseBrandCommands', () => {
  it('parses template literal commands using ${COMMAND_PREFIX}', () => {
    const source = makeBrandSource(`
  lintFile: \`\${COMMAND_PREFIX}.lint.file\`,
  lintFix: \`\${COMMAND_PREFIX}.lint.fix\`,
`);
    const result = parseBrandCommands(source);

    expect(result.size).toBe(2);
    expect(result.get('lintFile')).toBe('resist.lint.file');
    expect(result.get('lintFix')).toBe('resist.lint.fix');
  });

  it('parses single-quoted string commands', () => {
    const source = makeBrandSource(`
  lintFile: 'resist.lint.file',
  lintFix: 'resist.lint.fix',
`);
    const result = parseBrandCommands(source);

    expect(result.size).toBe(2);
    expect(result.get('lintFile')).toBe('resist.lint.file');
    expect(result.get('lintFix')).toBe('resist.lint.fix');
  });

  it('parses mixed single-quoted and template literal commands', () => {
    const source = makeBrandSource(`
  lintFile: 'resist.lint.file',
  lintFix: \`\${COMMAND_PREFIX}.lint.fix\`,
`);
    const result = parseBrandCommands(source);

    expect(result.size).toBe(2);
    expect(result.get('lintFile')).toBe('resist.lint.file');
    expect(result.get('lintFix')).toBe('resist.lint.fix');
  });

  it('resolves custom COMMAND_PREFIX in template literals', () => {
    const source = makeBrandSource(`  myCmd: \`\${COMMAND_PREFIX}.tools.run\`,`, 'acme');
    const result = parseBrandCommands(source);

    expect(result.size).toBe(1);
    expect(result.get('myCmd')).toBe('acme.tools.run');
  });

  it('parses all 25 commands from real brand.ts pattern', () => {
    const source = makeBrandSource(`
  lintFile: \`\${COMMAND_PREFIX}.lint.file\`,
  lintWorkspace: \`\${COMMAND_PREFIX}.lint.workspace\`,
  lintFix: \`\${COMMAND_PREFIX}.lint.fix\`,
  lintClear: \`\${COMMAND_PREFIX}.lint.clear\`,
  listRules: \`\${COMMAND_PREFIX}.lint.listRules\`,
  restart: \`\${COMMAND_PREFIX}.lint.restart\`,
  showOutput: \`\${COMMAND_PREFIX}.lint.showOutput\`,
  lintStaged: \`\${COMMAND_PREFIX}.lint.staged\`,
  lintUncommitted: \`\${COMMAND_PREFIX}.lint.uncommitted\`,
  previewFixes: \`\${COMMAND_PREFIX}.lint.previewFixes\`,
  filterByCategory: \`\${COMMAND_PREFIX}.lint.filterByCategory\`,
  clearFilter: \`\${COMMAND_PREFIX}.lint.clearFilter\`,
  removeUnusedImports: \`\${COMMAND_PREFIX}.lint.removeUnusedImports\`,
  changeStage: \`\${COMMAND_PREFIX}.lint.changeStage\`,
  clearOutput: \`\${COMMAND_PREFIX}.lint.clearOutput\`,
  debugToggle: \`\${COMMAND_PREFIX}.lint.debugToggle\`,
  toggleEnable: \`\${COMMAND_PREFIX}.lint.toggleEnable\`,
  statusBarMenu: \`\${COMMAND_PREFIX}.lint.statusBarMenu\`,
  panelExpandAll: \`\${COMMAND_PREFIX}.panel.expandAll\`,
  panelFilter: \`\${COMMAND_PREFIX}.panel.filter\`,
  panelClearFilter: \`\${COMMAND_PREFIX}.panel.clearFilter\`,
  panelMenu: \`\${COMMAND_PREFIX}.panel.menu\`,
  panelShowLocation: \`\${COMMAND_PREFIX}.panel.showLocation\`,
  panelShowRule: \`\${COMMAND_PREFIX}.panel.showRule\`,
  panelAutoFix: \`\${COMMAND_PREFIX}.panel.autoFix\`,
`);
    const result = parseBrandCommands(source);

    expect(result.size).toBe(25);
    expect(result.get('lintFile')).toBe('resist.lint.file');
    expect(result.get('changeStage')).toBe('resist.lint.changeStage');
    expect(result.get('clearOutput')).toBe('resist.lint.clearOutput');
    expect(result.get('toggleEnable')).toBe('resist.lint.toggleEnable');
    expect(result.get('statusBarMenu')).toBe('resist.lint.statusBarMenu');
    expect(result.get('panelAutoFix')).toBe('resist.panel.autoFix');
  });

  it('returns empty map when COMMANDS block has no entries', () => {
    const source = makeBrandSource('');
    const result = parseBrandCommands(source);

    expect(result.size).toBe(0);
  });

  it('throws when COMMANDS block is missing', () => {
    const source = `export const COMMAND_PREFIX = 'resist';`;

    expect(() => parseBrandCommands(source)).toThrow('Could not parse COMMANDS');
  });

  it('throws when COMMAND_PREFIX is missing', () => {
    const source = `
export const COMMANDS = {
  cmd: \`\${COMMAND_PREFIX}.lint.file\`,
} as const;
`;
    expect(() => parseBrandCommands(source)).toThrow('Could not parse COMMAND_PREFIX');
  });

  it('parses actual brand.ts file without error', () => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const brandPath = resolve(__dirname, '../src/shared/brand.ts');
    const brandSource = readFileSync(brandPath, 'utf8');

    const result = parseBrandCommands(brandSource);

    expect(result.size).toBe(25);
    // Verify every value starts with the prefix
    for (const [_key, cmdId] of result) {
      expect(cmdId).toMatch(/^resist\./);
    }
  });
});
