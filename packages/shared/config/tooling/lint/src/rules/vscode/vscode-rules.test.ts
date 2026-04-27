/**
 * Tests for the `vscode/*` lint rules — covers `no-hardcoded-brand`,
 * `no-unlocalized-strings`, `no-unread-settings`,
 * `no-unwired-commands`, and `require-error-boundary` against
 * shared VS Code extension fixture inputs.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { WorkspaceContext, WorkspacePackage } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
import noHardcodedBrand from './no-hardcoded-brand.ts';
import noUnlocalizedStrings from './no-unlocalized-strings.ts';
import noUnreadSettings from './no-unread-settings.ts';
import noUnwiredCommands from './no-unwired-commands.ts';
import requireErrorBoundary from './require-error-boundary.ts';
import { vscodeRuleInputs } from './_shared-inputs.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Build a mock WorkspaceContext with workspace packages.
 *
 * @param files - Map of file paths to contents
 * @param packages - Workspace packages
 * @returns Mock WorkspaceContext
 */
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

// =============================================================================
// vscode/no-hardcoded-brand
// =============================================================================

describe('vscode/no-hardcoded-brand', () => {
  it('reports hardcoded brand string in source file', async () => {
    const sourceTs = `
const channelName = 'Resist';
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/shared/output.ts': sourceTs,
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

    const results: LintResult[] = await noHardcodedBrand.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('vscode/no-hardcoded-brand');
    expect(results[0]?.message).toContain('BRAND_NAME');
  });

  it('reports hardcoded binary name', async () => {
    const sourceTs = `
const binary = 'resist-lint';
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/shared/workspace.ts': sourceTs,
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

    const results: LintResult[] = await noHardcodedBrand.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('BINARY_NAME');
  });

  it('passes when no hardcoded brand strings', async () => {
    const sourceTs = `
import { BRAND_NAME } from './shared/brand';
const channelName = BRAND_NAME;
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': sourceTs,
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

    const results: LintResult[] = await noHardcodedBrand.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips brand.ts itself', async () => {
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
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

    const results: LintResult[] = await noHardcodedBrand.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files', async () => {
    const testTs = `
const name = 'Resist';
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.test.ts': testTs,
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

    const results: LintResult[] = await noHardcodedBrand.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('detects hardcoded diagnostic source', async () => {
    const sourceTs = `
const source = 'resist-linter';
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/provider.ts': sourceTs,
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

    const results: LintResult[] = await noHardcodedBrand.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('DIAGNOSTIC_SOURCE');
  });
});

// =============================================================================
// vscode/no-unlocalized-strings
// =============================================================================

describe('vscode/no-unlocalized-strings', () => {
  it('reports raw string in showErrorMessage', async () => {
    const sourceTs = `
vscode.window.showErrorMessage('Something went wrong');
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': sourceTs,
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

    const results: LintResult[] = await noUnlocalizedStrings.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('vscode/no-unlocalized-strings');
    expect(results[0]?.message).toContain('showErrorMessage');
  });

  it('reports raw strings in showInformationMessage and showWarningMessage', async () => {
    const sourceTs = `
vscode.window.showInformationMessage('All done');
vscode.window.showWarningMessage("Be careful");
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': sourceTs,
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

    const results: LintResult[] = await noUnlocalizedStrings.check(ctx);
    expect(results).toHaveLength(2);
    expect(results[0]?.message).toContain('showInformationMessage');
    expect(results[1]?.message).toContain('showWarningMessage');
  });

  it('passes when using locale strings (variable reference)', async () => {
    const sourceTs = `
vscode.window.showErrorMessage(en.messages.fixRejected);
vscode.window.showInformationMessage(en.messages.noFixableProblems);
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': sourceTs,
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

    const results: LintResult[] = await noUnlocalizedStrings.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files', async () => {
    const testTs = `
vscode.window.showErrorMessage('test error');
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
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

    const results: LintResult[] = await noUnlocalizedStrings.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips locale files', async () => {
    const localeTs = `
showErrorMessage('Some default string for locale definition');
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/locale/en.ts': localeTs,
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

    const results: LintResult[] = await noUnlocalizedStrings.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// vscode/require-error-boundary
// =============================================================================

describe('vscode/require-error-boundary', () => {
  it('reports direct vscode.commands.registerCommand', async () => {
    const sourceTs = `
const disposable = vscode.commands.registerCommand('resist.lint.file', () => {});
context.subscriptions.push(disposable);
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': sourceTs,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.ruleId).toBe('vscode/require-error-boundary');
    expect(results[0]?.message).toContain('registerCommand');
    expect(results[0]?.message).toContain('command-registration.ts');
  });

  it('reports direct vscode.commands.registerTextEditorCommand', async () => {
    const sourceTs = `
vscode.commands.registerTextEditorCommand('resist.lint.fix', (editor) => {});
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/commands.ts': sourceTs,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('registerCommand');
  });

  it('skips command-registration.ts (wrapper implementation)', async () => {
    const wrapperTs = `
const disposable = vscode.commands.registerCommand(id, () => {
  void safeRunAsync(channel, id, handler);
});
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/shared/command-registration.ts': wrapperTs,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('reports inline error extraction pattern', async () => {
    const sourceTs = `
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  logError(channel, message);
}
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/lint/provider.ts': sourceTs,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('extractMessage');
  });

  it('skips errors.ts (utility definition)', async () => {
    const errorsTs = `
function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/shared/errors.ts': errorsTs,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('passes when using wrappers and extractMessage', async () => {
    const sourceTs = `
import { registerCommand } from './shared/command-registration';
import { extractMessage } from './shared/errors';

registerCommand(context, channel, COMMANDS.lintFile, async () => {});

catch (error: unknown) {
  logError(channel, extractMessage(error));
}
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
        '/mock/ext/src/extension.ts': sourceTs,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips test files', async () => {
    const testTs = `
vscode.commands.registerCommand('resist.lint.file', () => {});
const msg = error instanceof Error ? error.message : String(error);
`;
    const ctx = createMockContext(
      {
        '/mock/ext/package.json': PKG_JSON_STR,
        '/mock/ext/src/shared/brand.ts': BRAND_TS,
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

    const results: LintResult[] = await requireErrorBoundary.check(ctx);
    expect(results).toHaveLength(0);
  });
});

describe('vscode/_shared-inputs', () => {
  it('vscodeRuleInputs returns ts files + package paths', async () => {
    const files: Record<string, string> = {
      '/mock/a.ts': 'export const a = 1;',
      '/mock/b.ts': 'export const b = 2;',
      '/mock/c.md': 'docs',
    };
    const packages: WorkspacePackage[] = [
      {
        name: '@/x',
        path: '/mock/packages/x/package.json',
        dir: '/mock/packages/x',
        packageJson: { name: '@/x' },
      },
      {
        name: '@/y',
        path: '/mock/packages/y/package.json',
        dir: '/mock/packages/y',
        packageJson: { name: '@/y' },
      },
    ];
    const ctx: WorkspaceContext = createMockContext(files, packages);
    const inputs = await vscodeRuleInputs(ctx);
    expect(inputs).toEqual(
      expect.arrayContaining([
        '/mock/a.ts',
        '/mock/b.ts',
        '/mock/packages/x/package.json',
        '/mock/packages/y/package.json',
      ]),
    );
    expect(inputs).not.toContain('/mock/c.md');
  });

  it('vscodeRuleInputs returns empty arrays gracefully', async () => {
    const ctx: WorkspaceContext = createMockContext({}, []);
    const inputs = await vscodeRuleInputs(ctx);
    expect(inputs).toEqual([]);
  });
});
