/**
 * Tool Installer
 *
 * Handles tool availability checking and installation prompts.
 *
 * @module
 */

import * as vscode from 'vscode';
import { getAllFormatters } from './formatter.js';
import { isToolAvailable } from '@/cli/utils/installer';
import { getConfig } from '@/config/loader';
import { type Result, err, okUnchecked, ERRORS } from '@/schemas/result/result';

// ============================================================================
// Install Commands
// ============================================================================

interface InstallCommand {
  /** Package name(s) to install */
  packages: string;
  type: 'npm' | 'pip' | 'brew' | 'cargo' | 'manual';
  description: string;
  /** Manual command override (for non-npm tools) */
  manualCommand?: string;
}

/**
 * Gets the package-manager-specific command for adding a dev dependency.
 *
 * @returns `Result<string>` — install command prefix (e.g., `'pnpm add -D'`), or a config load error.
 */
function getPmAddDev(): Result<string> {
  const configResult = getConfig();
  if (!configResult.ok)
    return err(ERRORS.CONFIG.LOAD_FAILED, {
      cause: configResult.error,
      meta: { configPath: 'resist.config.ts' },
    });
  const pm: string = configResult.data.tooling.packageManager.manager;
  switch (pm) {
    case 'npm':
      return okUnchecked<string>('npm install -D');
    case 'yarn':
      return okUnchecked<string>('yarn add -D');
    case 'bun':
      return okUnchecked<string>('bun add -d');
    case 'pnpm':
    default:
      return okUnchecked<string>('pnpm add -D');
  }
}

/**
 * Builds the full install command string for a tool.
 *
 * @param cmd - Install command metadata.
 * @returns `Result<string>` — shell command to install the tool, or a config load error.
 */
function getInstallCommand(cmd: InstallCommand): Result<string> {
  if (cmd.type === 'npm') {
    const pmResult: Result<string> = getPmAddDev();
    if (!pmResult.ok) return pmResult;
    return okUnchecked<string>(`${pmResult.data} ${cmd.packages}`);
  }
  return okUnchecked<string>(cmd.manualCommand || cmd.packages);
}

const INSTALL_COMMANDS: Record<string, InstallCommand> = {
  // npm tools
  biome: {
    packages: '@biomejs/biome',
    type: 'npm',
    description: 'TypeScript/JavaScript/JSON/CSS formatter',
  },
  prettier: { packages: 'prettier', type: 'npm', description: 'Multi-language formatter' },
  'prettier-plugin-svelte': {
    packages: 'prettier-plugin-svelte',
    type: 'npm',
    description: 'Svelte support for Prettier',
  },
  'prettier-plugin-astro': {
    packages: 'prettier-plugin-astro',
    type: 'npm',
    description: 'Astro support for Prettier',
  },
  taplo: { packages: '@taplo/cli', type: 'npm', description: 'TOML formatter' },
  'sql-formatter': { packages: 'sql-formatter', type: 'npm', description: 'SQL formatter' },
  prisma: { packages: 'prisma', type: 'npm', description: 'Prisma schema formatter' },

  // pip tools
  ruff: {
    packages: 'ruff',
    type: 'pip',
    manualCommand: 'pip install ruff',
    description: 'Fast Python formatter',
  },
  black: {
    packages: 'black',
    type: 'pip',
    manualCommand: 'pip install black',
    description: 'Python formatter',
  },
  sqlfluff: {
    packages: 'sqlfluff',
    type: 'pip',
    manualCommand: 'pip install sqlfluff',
    description: 'SQL linter and formatter',
  },

  // brew tools
  shfmt: {
    packages: 'shfmt',
    type: 'brew',
    manualCommand: 'brew install shfmt',
    description: 'Shell script formatter',
  },
  stylua: {
    packages: 'stylua',
    type: 'brew',
    manualCommand: 'brew install stylua',
    description: 'Lua formatter',
  },
  'clang-format': {
    packages: 'clang-format',
    type: 'brew',
    manualCommand: 'brew install clang-format',
    description: 'C/C++ formatter',
  },
  nixfmt: {
    packages: 'nixfmt',
    type: 'brew',
    manualCommand: 'brew install nixfmt',
    description: 'Nix formatter',
  },
  alejandra: {
    packages: 'alejandra',
    type: 'brew',
    manualCommand: 'brew install alejandra',
    description: 'Nix formatter',
  },

  // cargo tools
  rustfmt: {
    packages: 'rustfmt',
    type: 'cargo',
    manualCommand: 'rustup component add rustfmt',
    description: 'Rust formatter',
  },

  // manual tools
  gofmt: {
    packages: 'go',
    type: 'brew',
    manualCommand: 'brew install go',
    description: 'Go formatter (included with Go)',
  },
  terraform: {
    packages: 'terraform',
    type: 'brew',
    manualCommand: 'brew install terraform',
    description: 'Terraform formatter',
  },
  rubocop: {
    packages: 'rubocop',
    type: 'manual',
    manualCommand: 'gem install rubocop',
    description: 'Ruby formatter',
  },
  pint: {
    packages: 'laravel/pint',
    type: 'manual',
    manualCommand: 'composer global require laravel/pint',
    description: 'PHP formatter',
  },
  'php-cs-fixer': {
    packages: 'friendsofphp/php-cs-fixer',
    type: 'manual',
    manualCommand: 'composer global require friendsofphp/php-cs-fixer',
    description: 'PHP formatter',
  },
};

// ============================================================================
// Tool Info
// ============================================================================

interface ToolInfo {
  name: string;
  installed: boolean;
  required: boolean;
  installCommand?: InstallCommand;
  fileTypes: string[];
}

/**
 * Scans all registered formatters and returns the install status of each tool.
 *
 * @returns `Result<ToolInfo[]>` — tool info objects with name, install state, and file types, or an error.
 */
export async function getToolStatus(): Promise<Result<ToolInfo[]>> {
  const formatters = getAllFormatters();
  const tools: ToolInfo[] = [];
  const seenTools = new Set<string>();

  // biome and prettier are required
  const requiredTools = new Set(['biome', 'prettier']);

  // Check each formatter's tools
  for (const formatter of formatters) {
    if (formatter.tool === 'biome') {
      if (!seenTools.has('biome')) {
        seenTools.add('biome');
        const biomeAvail = isToolAvailable('biome');
        if (!biomeAvail.ok)
          return err(ERRORS.IO.EXEC_FAILED, {
            cause: biomeAvail.error,
            meta: { tool: 'biome', reason: 'Failed to check tool availability' },
          });
        tools.push({
          name: 'biome',
          installed: biomeAvail.data,
          required: true,
          installCommand: INSTALL_COMMANDS.biome,
          fileTypes: formatter.extensions || [],
        });
      }
    } else if (formatter.tool === 'prettier') {
      if (!seenTools.has('prettier')) {
        seenTools.add('prettier');
        const prettierAvail = isToolAvailable('prettier');
        if (!prettierAvail.ok)
          return err(ERRORS.IO.EXEC_FAILED, {
            cause: prettierAvail.error,
            meta: { tool: 'prettier', reason: 'Failed to check tool availability' },
          });
        tools.push({
          name: 'prettier',
          installed: prettierAvail.data,
          required: true,
          installCommand: INSTALL_COMMANDS.prettier,
          fileTypes: formatter.extensions || [],
        });
      }
    } else if (formatter.tool === 'external' && formatter.commands) {
      for (const cmd of formatter.commands) {
        if (!seenTools.has(cmd.bin)) {
          seenTools.add(cmd.bin);
          const cmdAvail = isToolAvailable(cmd.bin);
          if (!cmdAvail.ok)
            return err(ERRORS.IO.EXEC_FAILED, {
              cause: cmdAvail.error,
              meta: { tool: cmd.bin, reason: 'Failed to check tool availability' },
            });
          tools.push({
            name: cmd.bin,
            installed: cmdAvail.data,
            required: requiredTools.has(cmd.bin),
            installCommand: INSTALL_COMMANDS[cmd.bin],
            fileTypes: formatter.extensions || [],
          });
        }
      }
    }
  }

  return okUnchecked<ToolInfo[]>(tools);
}

// ============================================================================
// Installation UI
// ============================================================================

/**
 * Shows a VS Code quick pick allowing the user to select and install missing tools.
 *
 * @param tools - Tool info array (only missing tools with install commands are shown)
 * @param cwd - Workspace root path used as the terminal working directory
 */
export async function showToolInstallPicker(tools: ToolInfo[], cwd: string): Promise<void> {
  const items: { label: string; description: string; detail: string; tool: ToolInfo }[] = [];
  for (const tool of tools) {
    if (!tool.installed && tool.installCommand) {
      let cmdStr = '';
      if (tool.installCommand) {
        const cmdResult: Result<string> = getInstallCommand(tool.installCommand);
        if (!cmdResult.ok) {
          vscode.window.showErrorMessage(
            `Failed to get install command for ${tool.name}: ${cmdResult.error.message}`,
          );
          return;
        }
        cmdStr = cmdResult.data;
      }
      items.push({
        label: tool.name,
        description: tool.installCommand?.description || '',
        detail: `${tool.installCommand?.type.toUpperCase()}: ${cmdStr} | Files: ${tool.fileTypes.join(', ')}`,
        tool,
      });
    }
  }

  if (items.length === 0) {
    vscode.window.showInformationMessage('All formatting tools are already installed!');
    return;
  }

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Select tools to install',
    title: 'Install Formatting Tools',
  });

  if (!selected || selected.length === 0) {
    return;
  }

  const terminal = vscode.window.createTerminal('Resist Formatter Setup');
  terminal.show();
  terminal.sendText(`cd "${cwd}"`);

  // Group by install type
  const npmTools = selected.filter((s) => s.tool.installCommand?.type === 'npm');
  const pipTools = selected.filter((s) => s.tool.installCommand?.type === 'pip');
  const brewTools = selected.filter((s) => s.tool.installCommand?.type === 'brew');
  const otherTools = selected.filter(
    (s) => s.tool.installCommand && !['npm', 'pip', 'brew'].includes(s.tool.installCommand.type),
  );

  // Install npm packages together using the configured package manager
  if (npmTools.length > 0) {
    const pmResult: Result<string> = getPmAddDev();
    if (!pmResult.ok) {
      vscode.window.showErrorMessage(
        `Failed to determine package manager: ${pmResult.error.message}`,
      );
      return;
    }
    const packages = npmTools.map((t) => t.tool.installCommand!.packages).join(' ');
    terminal.sendText(`${pmResult.data} ${packages}`);
  }

  // Install pip packages together
  if (pipTools.length > 0) {
    const packages = pipTools.map((t) => t.tool.installCommand!.packages).join(' ');
    terminal.sendText(`pip install ${packages}`);
  }

  // Install brew packages together
  if (brewTools.length > 0) {
    const packages = brewTools.map((t) => t.tool.installCommand!.packages).join(' ');
    terminal.sendText(`brew install ${packages}`);
  }

  // Run other commands individually
  for (const item of otherTools) {
    const cmdResult: Result<string> = getInstallCommand(item.tool.installCommand!);
    if (!cmdResult.ok) {
      vscode.window.showErrorMessage(
        `Failed to get install command for ${item.tool.name}: ${cmdResult.error.message}`,
      );
      return;
    }
    terminal.sendText(cmdResult.data);
  }

  vscode.window.showInformationMessage(
    `Installing ${selected.length} tool(s). Check the terminal for progress.`,
  );
}

// ============================================================================
// Activation Check
// ============================================================================

/**
 * Checks for missing tools on extension activation and prompts the user to install them.
 *
 * @param context - VS Code extension context for reading/writing global state
 */
export async function checkAndInstallTools(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const config = vscode.workspace.getConfiguration('resistFormatter');
  if (!config.get('checkToolsOnActivation', true)) {
    return;
  }

  const cwd = workspaceFolders[0].uri.fsPath;
  const toolsResult: Result<ToolInfo[]> = await getToolStatus();
  if (!toolsResult.ok) {
    vscode.window.showErrorMessage(`Failed to check tool status: ${toolsResult.error.message}`);
    return;
  }
  const tools: ToolInfo[] = toolsResult.data;

  const missingRequired = tools.filter((t) => t.required && !t.installed);
  const missingOptional = tools.filter((t) => !t.required && !t.installed);

  // Prompt for required tools
  if (missingRequired.length > 0) {
    const requiredNames = missingRequired.map((t) => t.name).join(', ');
    const response = await vscode.window.showWarningMessage(
      `Resist Formatter: Required tools missing: ${requiredNames}`,
      'Install All',
      'Choose Tools',
      'Ignore',
    );

    if (response === 'Install All') {
      await showToolInstallPicker(missingRequired, cwd);
    } else if (response === 'Choose Tools') {
      await showToolInstallPicker(missingRequired, cwd);
    }
  }

  // Prompt for optional tools (once)
  const hasPrompted = context.globalState.get<boolean>('hasPromptedOptionalTools', false);
  if (!hasPrompted && missingOptional.length > 0) {
    const response = await vscode.window.showInformationMessage(
      `Resist Formatter: ${missingOptional.length} optional tools available for additional file types`,
      'View Tools',
      'Dismiss',
    );

    if (response === 'View Tools') {
      await showToolInstallPicker(missingOptional, cwd);
    }

    await context.globalState.update('hasPromptedOptionalTools', true);
  }
}

/**
 * Shows the tool management quick pick (install missing or view status).
 *
 * @param context - VS Code extension context (unused, reserved for future state)
 */
export async function showToolStatus(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const cwd = workspaceFolders[0].uri.fsPath;
  const toolsResult: Result<ToolInfo[]> = await getToolStatus();
  if (!toolsResult.ok) {
    vscode.window.showErrorMessage(`Failed to check tool status: ${toolsResult.error.message}`);
    return;
  }
  const tools: ToolInfo[] = toolsResult.data;

  const response = await vscode.window.showQuickPick(
    [
      { label: '$(tools) Install Missing Tools', action: 'install' as const },
      { label: '$(list-unordered) View Tool Status', action: 'status' as const },
    ],
    { placeHolder: 'Tool Management' },
  );

  if (response?.action === 'install') {
    const missingTools = tools.filter((t) => !t.installed);
    if (missingTools.length > 0) {
      await showToolInstallPicker(missingTools, cwd);
    } else {
      vscode.window.showInformationMessage('All tools are installed!');
    }
  } else if (response?.action === 'status') {
    const channel = vscode.window.createOutputChannel('Resist Formatter - Tool Status');
    channel.appendLine('Resist Formatter Tool Status');
    channel.appendLine('============================');
    channel.appendLine('');

    for (const tool of tools) {
      const status = tool.installed ? '✓' : '✗';
      const required = tool.required ? ' (required)' : '';
      channel.appendLine(
        `${status} ${tool.name}${required} - ${tool.installCommand?.description || 'No description'}`,
      );
    }

    channel.show();
  }
}

/**
 * Resets the optional tools prompt so it appears again on next activation.
 *
 * @param context - VS Code extension context for clearing global state
 */
export async function resetToolPrompt(context: vscode.ExtensionContext): Promise<void> {
  await context.globalState.update('hasPromptedOptionalTools', false);
  vscode.window.showInformationMessage('Optional tools prompt will show on next activation');
}
