import { describe, expect, it } from 'vitest';

import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
import noUnwiredCommands from './no-unwired-commands.ts';
import noUnreadSettings from './no-unread-settings.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/** Build a mock WorkspaceContext with workspace packages. */
function createMockContext(
  files: Record<string, string>,
  packages: WorkspacePackage[],
): WorkspaceContext {
  const filePaths: string[] = Object.keys(files);
  return {
    rootDir: '/mock',
    allFiles: async (): Promise<readonly string[]> => filePaths,
    filesByExtension: async (...exts: string[]): Promise<readonly string[]> =>
      filePaths.filter((f: string): boolean => exts.some((e: string): boolean => f.endsWith(e))),
    readFile: async (path: string): Promise<string> => files[path] ?? '',
    fileExists: async (path: string): Promise<boolean> => path in files,
    dirExists: async (): Promise<boolean> => false,
    getWorkspacePackages: async () => packages,
  };
}

/** Minimal brand.ts with COMMANDS and CONFIG_SECTION. */
const BRAND_TS = `
export const COMMAND_PREFIX = 'resist';
export const CONFIG_SECTION = 'resist';

export const COMMANDS = {
  lintFile: \`\${COMMAND_PREFIX}.lint.file\`,
  lintWorkspace: \`\${COMMAND_PREFIX}.lint.workspace\`,
  showOutput: \`\${COMMAND_PREFIX}.lint.showOutput\`,
} as const;
`;

/** package.json with commands and settings. */
const PKG_JSON_OBJ: Record<string, unknown> = {
  name: '@resist/vscode',
  contributes: {
    commands: [
      { command: 'resist.lint.file', title: 'Lint File' },
      { command: 'resist.lint.workspace', title: 'Lint Workspace' },
      { command: 'resist.lint.showOutput', title: 'Show Output' },
    ],
    configuration: {
      properties: {
        'resist.lint.enable': { type: 'boolean', default: true },
        'resist.lint.onSave': { type: 'boolean', default: true },
        'resist.lint.debounceMs': { type: 'number', default: 500 },
      },
    },
  },
};

const PKG_JSON_STR: string = JSON.stringify(PKG_JSON_OBJ, null, 2);

// =============================================================================
// vscode/no-unwired-commands
// =============================================================================

describe('vscode/no-unwired-commands', () => {
  it('reports commands defined but never referenced in registerCommand calls', async () => {
    /* commands.ts only registers lintFile and lintWorkspace — showOutput is missing */
    const commandsTs = `
import { COMMANDS } from '../shared/brand';
import { registerCommand, registerTextEditorCommand } from '../shared/command-registration';

registerTextEditorCommand(context, outputChannel, COMMANDS.lintFile, async (editor) => {});
registerCommand(context, outputChannel, COMMANDS.lintWorkspace, async () => {});
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': commandsTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnwiredCommands.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('vscode/no-unwired-commands');
    expect(results[0]?.message).toContain('showOutput');
    expect(results[0]?.message).toContain('never referenced');
  });

  it('passes when all commands are registered', async () => {
    const commandsTs = `
import { COMMANDS } from '../shared/brand';
import { registerCommand, registerTextEditorCommand } from '../shared/command-registration';

registerTextEditorCommand(context, outputChannel, COMMANDS.lintFile, async (editor) => {});
registerCommand(context, outputChannel, COMMANDS.lintWorkspace, async () => {});
registerCommand(context, outputChannel, COMMANDS.showOutput, async () => {});
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': commandsTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnwiredCommands.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips packages without contributes.commands', async () => {
    const ctx = createMockContext({ '/mock/lib/package.json': '{}' }, [
      {
        path: '/mock/lib/package.json',
        dir: '/mock/lib',
        packageJson: { name: '@resist/lib' },
        name: '@resist/lib',
      },
    ]);

    const results: LintResult[] = await noUnwiredCommands.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files and mock files when searching for registerCommand', async () => {
    /* Only test file references the command — should still report as unwired */
    const testTs = `
registerCommand(context, outputChannel, COMMANDS.showOutput, async () => {});
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': `
registerTextEditorCommand(context, outputChannel, COMMANDS.lintFile, async () => {});
registerCommand(context, outputChannel, COMMANDS.lintWorkspace, async () => {});
`,
        '/mock/ext/src/lint/commands.test.ts': testTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnwiredCommands.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('showOutput');
  });

  it('detects commands referenced by direct string ID', async () => {
    /* Reference via direct string instead of COMMANDS constant */
    const commandsTs = `
registerTextEditorCommand(context, outputChannel, COMMANDS.lintFile, async () => {});
registerCommand(context, outputChannel, COMMANDS.lintWorkspace, async () => {});
vscode.commands.registerCommand('resist.lint.showOutput', () => {});
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': commandsTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnwiredCommands.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// vscode/no-unread-settings
// =============================================================================

describe('vscode/no-unread-settings', () => {
  it('reports settings declared but never read', async () => {
    /* extension.ts only reads lint.enable — onSave and debounceMs are missing */
    const extensionTs = `
const enabled = configManager.get<boolean>('lint.enable', true);
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': extensionTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnreadSettings.check(ctx);
    expect(results).toHaveLength(2);
    const messages: string[] = results.map((r) => r.message);
    expect(messages.some((m) => m.includes('resist.lint.onSave'))).toBe(true);
    expect(messages.some((m) => m.includes('resist.lint.debounceMs'))).toBe(true);
  });

  it('passes when all settings are read', async () => {
    const extensionTs = `
const enabled = configManager.get<boolean>('lint.enable', true);
const onSave = configManager.get<boolean>('lint.onSave', true);
const debounceMs = configManager.get<number>('lint.debounceMs', 500);
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': extensionTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnreadSettings.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('matches settings read with full key (getConfiguration style)', async () => {
    /* Using full key including the section prefix */
    const extensionTs = `
const enabled = config.get('resist.lint.enable', true);
const onSave = config.get('resist.lint.onSave', true);
const debounceMs = config.get('resist.lint.debounceMs', 500);
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': extensionTs,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnreadSettings.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips packages without contributes.configuration', async () => {
    const ctx = createMockContext({ '/mock/lib/package.json': '{}' }, [
      {
        path: '/mock/lib/package.json',
        dir: '/mock/lib',
        packageJson: { name: '@resist/lib' },
        name: '@resist/lib',
      },
    ]);

    const results: LintResult[] = await noUnreadSettings.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files when searching for config.get calls', async () => {
    /* Only test file reads the setting — should still report as unread */
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': `
const enabled = configManager.get<boolean>('lint.enable', true);
const onSave = configManager.get<boolean>('lint.onSave', true);
`,
        '/mock/ext/src/extension.test.ts': `
const debounceMs = configManager.get<number>('lint.debounceMs', 500);
`,
      },
      [
        {
          path: '/mock/ext/package.json',
          dir: '/mock/ext',
          packageJson: PKG_JSON_OBJ,
          name: '@resist/vscode',
        },
      ],
    );

    const results: LintResult[] = await noUnreadSettings.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('resist.lint.debounceMs');
  });
});
