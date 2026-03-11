import * as vscode from 'vscode';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

let diagnosticCollection: vscode.DiagnosticCollection;
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

// Tool definitions with install commands
interface ToolDefinition {
	name: string;
	command: string;
	installCommand: string;
	installType: 'npm' | 'pip' | 'cargo' | 'brew' | 'manual';
	required: boolean;
	description: string;
	fileTypes: string[];
}

const TOOLS: ToolDefinition[] = [
	{
		name: 'oxlint',
		command: 'oxlint',
		installCommand: 'pnpm add -D oxlint',
		installType: 'npm',
		required: true,
		description: 'JavaScript/TypeScript linter',
		fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
	},
	{
		name: 'oxc-parser',
		command: 'oxc-parser',
		installCommand: 'pnpm add -D oxc-parser',
		installType: 'npm',
		required: false,
		description: 'TypeScript parser for custom AST rules',
		fileTypes: ['.ts', '.tsx'],
	},
	{
		name: 'biome',
		command: 'biome',
		installCommand: 'pnpm add -D @biomejs/biome',
		installType: 'npm',
		required: true,
		description: 'JavaScript/TypeScript/JSON formatter and linter',
		fileTypes: ['.js', '.jsx', '.ts', '.tsx', '.json', '.jsonc'],
	},
	{
		name: 'prettier',
		command: 'prettier',
		installCommand: 'pnpm add -D prettier',
		installType: 'npm',
		required: false,
		description: 'Code formatter (optional, Biome preferred)',
		fileTypes: ['.md', '.yaml', '.yml'],
	},
	{
		name: 'svelte-check',
		command: 'svelte-check',
		installCommand: 'pnpm add -D svelte-check',
		installType: 'npm',
		required: false,
		description: 'Svelte type checker and linter',
		fileTypes: ['.svelte'],
	},
	{
		name: 'taplo',
		command: 'taplo',
		installCommand: 'pnpm add -D @taplo/cli',
		installType: 'npm',
		required: false,
		description: 'TOML linter and formatter',
		fileTypes: ['.toml'],
	},
	{
		name: 'markdownlint',
		command: 'markdownlint',
		installCommand: 'pnpm add -D markdownlint-cli',
		installType: 'npm',
		required: false,
		description: 'Markdown linter',
		fileTypes: ['.md', '.markdown'],
	},
	{
		name: 'stylelint',
		command: 'stylelint',
		installCommand: 'pnpm add -D stylelint stylelint-config-standard',
		installType: 'npm',
		required: false,
		description: 'CSS/SCSS/Less linter',
		fileTypes: ['.css', '.scss', '.sass', '.less'],
	},
	{
		name: 'htmlhint',
		command: 'htmlhint',
		installCommand: 'pnpm add -D htmlhint',
		installType: 'npm',
		required: false,
		description: 'HTML linter',
		fileTypes: ['.html', '.htm'],
	},
	{
		name: 'ember-template-lint',
		command: 'ember-template-lint',
		installCommand: 'pnpm add -D ember-template-lint',
		installType: 'npm',
		required: false,
		description: 'Handlebars/HBS template linter',
		fileTypes: ['.hbs', '.handlebars'],
	},
	{
		name: 'shellcheck',
		command: 'shellcheck',
		installCommand: 'brew install shellcheck',
		installType: 'brew',
		required: false,
		description: 'Shell script linter',
		fileTypes: ['.sh', '.bash', '.zsh'],
	},
	{
		name: 'ruff',
		command: 'ruff',
		installCommand: 'pip install ruff',
		installType: 'pip',
		required: false,
		description: 'Python linter (fast)',
		fileTypes: ['.py'],
	},
	{
		name: 'clippy',
		command: 'cargo',
		installCommand: 'rustup component add clippy',
		installType: 'cargo',
		required: false,
		description: 'Rust linter',
		fileTypes: ['.rs'],
	},
	{
		name: 'hadolint',
		command: 'hadolint',
		installCommand: 'brew install hadolint',
		installType: 'brew',
		required: false,
		description: 'Dockerfile linter',
		fileTypes: ['Dockerfile'],
	},
	{
		name: 'actionlint',
		command: 'actionlint',
		installCommand: 'brew install actionlint',
		installType: 'brew',
		required: false,
		description: 'GitHub Actions workflow linter',
		fileTypes: ['.github/workflows/*.yml', '.github/workflows/*.yaml'],
	},
	{
		name: 'sqlfluff',
		command: 'sqlfluff',
		installCommand: 'pip install sqlfluff',
		installType: 'pip',
		required: false,
		description: 'SQL linter',
		fileTypes: ['.sql'],
	},
	{
		name: 'svglint',
		command: 'svglint',
		installCommand: 'pnpm add -D svglint',
		installType: 'npm',
		required: false,
		description: 'SVG linter',
		fileTypes: ['.svg'],
	},
	{
		name: 'checkmake',
		command: 'checkmake',
		installCommand: 'brew install checkmake',
		installType: 'brew',
		required: false,
		description: 'Makefile linter',
		fileTypes: ['Makefile'],
	},
	{
		name: 'helm',
		command: 'helm',
		installCommand: 'brew install helm',
		installType: 'brew',
		required: false,
		description: 'Helm chart linter',
		fileTypes: ['Chart.yaml', 'values.yaml'],
	},
	{
		name: 'kubeconform',
		command: 'kubeconform',
		installCommand: 'brew install kubeconform',
		installType: 'brew',
		required: false,
		description: 'Kubernetes manifest validator (fast)',
		fileTypes: ['.yaml', '.yml'],
	},
	{
		name: 'kube-linter',
		command: 'kube-linter',
		installCommand: 'brew install kube-linter',
		installType: 'brew',
		required: false,
		description: 'Kubernetes best practices linter',
		fileTypes: ['.yaml', '.yml'],
	},
	{
		name: 'editorconfig-checker',
		command: 'ec',
		installCommand: 'brew install editorconfig-checker',
		installType: 'brew',
		required: false,
		description: 'EditorConfig compliance checker',
		fileTypes: ['.editorconfig'],
	},
	{
		name: 'typos',
		command: 'typos',
		installCommand: 'brew install typos-cli',
		installType: 'brew',
		required: false,
		description: 'Spelling checker (fast)',
		fileTypes: ['*'],
	},
	{
		name: 'cspell',
		command: 'cspell',
		installCommand: 'pnpm add -D cspell',
		installType: 'npm',
		required: false,
		description: 'Spelling checker (alternative to typos)',
		fileTypes: ['*'],
	},
	{
		name: 'gitleaks',
		command: 'gitleaks',
		installCommand: 'brew install gitleaks',
		installType: 'brew',
		required: false,
		description: 'Secret/credential detector',
		fileTypes: ['*'],
	},
	{
		name: 'trufflehog',
		command: 'trufflehog',
		installCommand: 'brew install trufflehog',
		installType: 'brew',
		required: false,
		description: 'Secret detector (alternative to gitleaks)',
		fileTypes: ['*'],
	},
	{
		name: 'jscpd',
		command: 'jscpd',
		installCommand: 'pnpm add -D jscpd',
		installType: 'npm',
		required: false,
		description: 'Copy/paste detection',
		fileTypes: ['*'],
	},
	{
		name: 'knip',
		command: 'knip',
		installCommand: 'pnpm add -D knip',
		installType: 'npm',
		required: false,
		description: 'Dead code/unused exports detection',
		fileTypes: ['*'],
	},
	{
		name: 'madge',
		command: 'madge',
		installCommand: 'pnpm add -D madge',
		installType: 'npm',
		required: false,
		description: 'Circular dependency detection',
		fileTypes: ['.js', '.ts', '.jsx', '.tsx'],
	},
	{
		name: 'publint',
		command: 'publint',
		installCommand: 'pnpm add -D publint',
		installType: 'npm',
		required: false,
		description: 'Package publishing validation',
		fileTypes: ['package.json'],
	},
	{
		name: 'attw',
		command: 'attw',
		installCommand: 'pnpm add -D @arethetypeswrong/cli',
		installType: 'npm',
		required: false,
		description: 'TypeScript exports validation',
		fileTypes: ['package.json'],
	},
	{
		name: 'sort-package-json',
		command: 'sort-package-json',
		installCommand: 'pnpm add -D sort-package-json',
		installType: 'npm',
		required: false,
		description: 'Package.json field ordering',
		fileTypes: ['package.json'],
	},
	{
		name: 'dependency-cruiser',
		command: 'depcruise',
		installCommand: 'pnpm add -D dependency-cruiser',
		installType: 'npm',
		required: false,
		description: 'Architecture/dependency rules',
		fileTypes: ['.js', '.ts', '.jsx', '.tsx'],
	},
	{
		name: 'license-checker',
		command: 'license-checker',
		installCommand: 'pnpm add -D license-checker',
		installType: 'npm',
		required: false,
		description: 'License compliance checking',
		fileTypes: ['package.json'],
	},
	{
		name: 'syncpack',
		command: 'syncpack',
		installCommand: 'pnpm add -D syncpack',
		installType: 'npm',
		required: false,
		description: 'Monorepo dependency version sync',
		fileTypes: ['package.json'],
	},
	{
		name: 'ls-lint',
		command: 'ls-lint',
		installCommand: 'pnpm add -D @ls-lint/ls-lint',
		installType: 'npm',
		required: false,
		description: 'File/folder naming conventions',
		fileTypes: ['*'],
	},
	{
		name: 'lockfile-lint',
		command: 'lockfile-lint',
		installCommand: 'pnpm add -D lockfile-lint',
		installType: 'npm',
		required: false,
		description: 'Lockfile security validation',
		fileTypes: ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'],
	},
	{
		name: 'commitlint',
		command: 'commitlint',
		installCommand: 'pnpm add -D @commitlint/cli @commitlint/config-conventional',
		installType: 'npm',
		required: false,
		description: 'Commit message linting',
		fileTypes: [],
	},
	{
		name: 'codeowners-checker',
		command: 'codeowners-checker',
		installCommand: 'pnpm add -D codeowners-checker',
		installType: 'npm',
		required: false,
		description: 'CODEOWNERS path validation',
		fileTypes: ['CODEOWNERS'],
	},
];

// Check if a command exists
async function commandExists(command: string): Promise<boolean> {
	try {
		const { stdout } = await execAsync(
			process.platform === 'win32' ? `where ${command}` : `which ${command}`
		);
		return stdout.trim().length > 0;
	} catch {
		return false;
	}
}

// Check if a tool is available in node_modules/.bin
async function toolExistsLocally(tool: string, cwd: string): Promise<boolean> {
	const localPath = path.join(cwd, 'node_modules', '.bin', tool);
	try {
		await execAsync(`test -x "${localPath}"`);
		return true;
	} catch {
		return false;
	}
}

// Check tool availability (local first, then global)
async function isToolAvailable(tool: ToolDefinition, cwd: string): Promise<boolean> {
	if (tool.installType === 'npm') {
		// Check local node_modules first
		if (await toolExistsLocally(tool.command, cwd)) {
			return true;
		}
	}
	// Fall back to global check
	return commandExists(tool.command);
}

// Install a tool
async function installTool(
	tool: ToolDefinition,
	cwd: string,
	terminal: vscode.Terminal
): Promise<void> {
	terminal.show();
	terminal.sendText(`cd "${cwd}"`);
	terminal.sendText(tool.installCommand);
}

// Check and prompt for missing tools
async function checkAndInstallTools(context: vscode.ExtensionContext): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return;
	}

	const cwd = workspaceFolders[0].uri.fsPath;
	const config = vscode.workspace.getConfiguration('resistLinter');
	const autoCheck = config.get<boolean>('checkToolsOnActivation', true);

	if (!autoCheck) {
		return;
	}

	// Check which tools are missing
	const missingRequired: ToolDefinition[] = [];
	const missingOptional: ToolDefinition[] = [];

	for (const tool of TOOLS) {
		const available = await isToolAvailable(tool, cwd);
		if (!available) {
			if (tool.required) {
				missingRequired.push(tool);
			} else {
				missingOptional.push(tool);
			}
		}
	}

	// Handle required tools
	if (missingRequired.length > 0) {
		const requiredNames = missingRequired.map((t) => t.name).join(', ');
		const response = await vscode.window.showWarningMessage(
			`Resist Linter: Required tools missing: ${requiredNames}`,
			'Install All',
			'Choose Tools',
			'Ignore'
		);

		if (response === 'Install All') {
			const terminal = vscode.window.createTerminal('Resist Linter Setup');
			for (const tool of missingRequired) {
				await installTool(tool, cwd, terminal);
			}
			vscode.window.showInformationMessage(
				'Installing required tools. Check the terminal for progress.'
			);
		} else if (response === 'Choose Tools') {
			await showToolInstallPicker(missingRequired, cwd);
		}
	}

	// Handle optional tools (only on first activation)
	const hasPromptedOptional = context.globalState.get<boolean>('hasPromptedOptionalTools', false);
	if (!hasPromptedOptional && missingOptional.length > 0) {
		const response = await vscode.window.showInformationMessage(
			`Resist Linter: ${missingOptional.length} optional tools available for additional file types`,
			'View Tools',
			'Dismiss'
		);

		if (response === 'View Tools') {
			await showToolInstallPicker(missingOptional, cwd);
		}

		await context.globalState.update('hasPromptedOptionalTools', true);
	}
}

// Show a quick pick for selecting tools to install
async function showToolInstallPicker(tools: ToolDefinition[], cwd: string): Promise<void> {
	const items = tools.map((tool) => ({
		label: tool.name,
		description: tool.description,
		detail: `${tool.installType.toUpperCase()}: ${tool.installCommand} | Files: ${tool.fileTypes.join(', ')}`,
		tool,
	}));

	const selected = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: 'Select tools to install',
		title: 'Install Linting Tools',
	});

	if (selected && selected.length > 0) {
		const terminal = vscode.window.createTerminal('Resist Linter Setup');

		// Group by install type for better UX
		const npmTools = selected.filter((s) => s.tool.installType === 'npm');
		const pipTools = selected.filter((s) => s.tool.installType === 'pip');
		const brewTools = selected.filter((s) => s.tool.installType === 'brew');
		const otherTools = selected.filter(
			(s) => !['npm', 'pip', 'brew'].includes(s.tool.installType)
		);

		terminal.show();
		terminal.sendText(`cd "${cwd}"`);

		// Install npm tools together
		if (npmTools.length > 0) {
			const packages = npmTools.map((t) => t.tool.installCommand.replace('pnpm add -D ', '')).join(' ');
			terminal.sendText(`pnpm add -D ${packages}`);
		}

		// Install pip tools together
		if (pipTools.length > 0) {
			const packages = pipTools.map((t) => t.tool.installCommand.replace('pip install ', '')).join(' ');
			terminal.sendText(`pip install ${packages}`);
		}

		// Install brew tools together
		if (brewTools.length > 0) {
			const packages = brewTools.map((t) => t.tool.installCommand.replace('brew install ', '')).join(' ');
			terminal.sendText(`brew install ${packages}`);
		}

		// Install other tools one by one
		for (const item of otherTools) {
			terminal.sendText(item.tool.installCommand);
		}

		vscode.window.showInformationMessage(
			`Installing ${selected.length} tool(s). Check the terminal for progress.`
		);
	}
}

export function activate(context: vscode.ExtensionContext): void {
	console.log('Resist Linter activated');

	diagnosticCollection = vscode.languages.createDiagnosticCollection('resist-linter');
	context.subscriptions.push(diagnosticCollection);

	// Check for missing tools on activation
	checkAndInstallTools(context);

	// Lint on open
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((doc) => {
			const config = vscode.workspace.getConfiguration('resistLinter');
			if (config.get('enable') && config.get('lintOnOpen')) {
				lintDocument(doc);
			}
		})
	);

	// Lint on save
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((doc) => {
			const config = vscode.workspace.getConfiguration('resistLinter');
			if (config.get('enable') && config.get('lintOnSave')) {
				lintDocument(doc);
			}
		})
	);

	// Lint on type (debounced)
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			const config = vscode.workspace.getConfiguration('resistLinter');
			if (config.get('enable') && config.get('lintOnType')) {
				const doc = event.document;
				const uri = doc.uri.toString();

				// Clear existing timer
				const existingTimer = debounceTimers.get(uri);
				if (existingTimer) {
					clearTimeout(existingTimer);
				}

				// Set new timer
				const debounceMs = config.get<number>('debounceMs') || 500;
				const timer = setTimeout(() => {
					lintDocument(doc);
					debounceTimers.delete(uri);
				}, debounceMs);

				debounceTimers.set(uri, timer);
			}
		})
	);

	// Clear diagnostics on close
	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((doc) => {
			diagnosticCollection.delete(doc.uri);
			debounceTimers.delete(doc.uri.toString());
		})
	);

	// Lint all open documents on activation
	const config = vscode.workspace.getConfiguration('resistLinter');
	if (config.get('enable') && config.get('lintOnOpen')) {
		vscode.workspace.textDocuments.forEach((doc) => {
			lintDocument(doc);
		});
	}

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.lintFile', () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				lintDocument(editor.document);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.lintAll', () => {
			vscode.workspace.textDocuments.forEach((doc) => {
				lintDocument(doc);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.clearDiagnostics', () => {
			diagnosticCollection.clear();
		})
	);

	// Command to check/install tools manually
	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.checkTools', async () => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				vscode.window.showErrorMessage('No workspace folder open');
				return;
			}

			const cwd = workspaceFolders[0].uri.fsPath;
			const results: string[] = [];

			for (const tool of TOOLS) {
				const available = await isToolAvailable(tool, cwd);
				results.push(`${available ? '✓' : '✗'} ${tool.name} - ${tool.description}`);
			}

			const response = await vscode.window.showQuickPick(
				[
					{ label: '$(tools) Install Missing Tools', action: 'install' },
					{ label: '$(list-unordered) View Tool Status', action: 'status' },
				],
				{ placeHolder: 'Tool Management' }
			);

			if (response?.action === 'install') {
				const missingTools = [];
				for (const tool of TOOLS) {
					if (!(await isToolAvailable(tool, cwd))) {
						missingTools.push(tool);
					}
				}
				if (missingTools.length > 0) {
					await showToolInstallPicker(missingTools, cwd);
				} else {
					vscode.window.showInformationMessage('All tools are installed!');
				}
			} else if (response?.action === 'status') {
				const channel = vscode.window.createOutputChannel('Resist Linter - Tool Status');
				channel.appendLine('Resist Linter Tool Status');
				channel.appendLine('========================');
				channel.appendLine('');
				results.forEach((r) => channel.appendLine(r));
				channel.show();
			}
		})
	);

	// Command to reset optional tools prompt
	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.resetToolPrompt', async () => {
			await context.globalState.update('hasPromptedOptionalTools', false);
			vscode.window.showInformationMessage('Optional tools prompt will show on next activation');
		})
	);

	// Command to list custom rules
	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.listCustomRules', async () => {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				vscode.window.showErrorMessage('No workspace folder open');
				return;
			}

			const cwd = workspaceFolders[0].uri.fsPath;
			const lintScript = path.join(cwd, 'scripts', 'lint.mjs');

			try {
				const { stdout } = await execAsync(`node "${lintScript}" --list-rules`, { cwd });
				const channel = vscode.window.createOutputChannel('Resist Linter - Custom Rules');
				channel.appendLine(stdout);
				channel.show();
			} catch (error) {
				vscode.window.showWarningMessage(
					'Custom rules not available. Run `pnpm build:rules` to compile custom rules.'
				);
			}
		})
	);

	// Command to run only custom rules
	context.subscriptions.push(
		vscode.commands.registerCommand('resistLinter.lintCustomRules', () => {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				lintDocumentWithOptions(editor.document, { onlyCustomRules: true });
			}
		})
	);

	// Status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '$(check) Resist Linter';
	statusBarItem.tooltip = 'Resist Linter is active - Click to check tools';
	statusBarItem.command = 'resistLinter.checkTools';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}

interface LintOptions {
	onlyCustomRules?: boolean;
	skipCustomRules?: boolean;
	stage?: string;
	categories?: string[];
}

async function lintDocument(document: vscode.TextDocument): Promise<void> {
	const config = vscode.workspace.getConfiguration('resistLinter');
	const customRulesEnabled = config.get<boolean>('customRules.enable', true);
	const stage = config.get<string>('customRules.stage', 'lint');
	const categories = config.get<string[]>('customRules.categories', []);

	return lintDocumentWithOptions(document, {
		skipCustomRules: !customRulesEnabled,
		stage,
		categories,
	});
}

async function lintDocumentWithOptions(
	document: vscode.TextDocument,
	options: LintOptions
): Promise<void> {
	// Skip non-file schemes
	if (document.uri.scheme !== 'file') {
		return;
	}

	// Skip untitled documents
	if (document.isUntitled) {
		return;
	}

	const filePath = document.uri.fsPath;
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

	if (!workspaceFolder) {
		return;
	}

	const cwd = workspaceFolder.uri.fsPath;
	const lintScript = path.join(cwd, 'scripts', 'lint.mjs');

	// Add node_modules/.bin to PATH for local tools
	const nodeModulesBin = path.join(cwd, 'node_modules', '.bin');
	const env = {
		...process.env,
		FORCE_COLOR: '0',
		PATH: `${nodeModulesBin}${path.delimiter}${process.env.PATH}`,
	};

	// Build extra flags based on options
	const extraFlags: string[] = [];
	if (options.onlyCustomRules) {
		extraFlags.push('--only-custom-rules');
	}
	if (options.skipCustomRules) {
		extraFlags.push('--no-custom-rules');
	}
	if (options.stage) {
		extraFlags.push(`--stage=${options.stage}`);
	}
	if (options.categories && options.categories.length > 0) {
		extraFlags.push(`--category=${options.categories.join(',')}`);
	}

	try {
		const results = await runLinter(lintScript, filePath, cwd, env, extraFlags);
		const config = vscode.workspace.getConfiguration('resistLinter');
		const maxProblems = config.get<number>('maxProblems') || 100;

		const diagnostics = results
			.slice(0, maxProblems)
			.map((result) => createDiagnostic(result, document));

		diagnosticCollection.set(document.uri, diagnostics);
	} catch (error) {
		console.error('Resist Linter error:', error);
	}
}

interface LintResult {
	file: string;
	line: number;
	column: number;
	severity: string;
	message: string;
}

async function runLinter(
	lintScript: string,
	filePath: string,
	cwd: string,
	env: NodeJS.ProcessEnv,
	extraFlags: string[] = []
): Promise<LintResult[]> {
	return new Promise((resolve) => {
		const args = [lintScript, '--json', ...extraFlags, filePath];
		const child = spawn('node', args, {
			cwd,
			stdio: ['pipe', 'pipe', 'pipe'],
			env,
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		child.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		child.on('close', () => {
			if (stdout.trim()) {
				try {
					const results = JSON.parse(stdout) as LintResult[];
					resolve(results);
				} catch {
					// Parse unix format as fallback
					const results = parseUnixOutput(stdout);
					resolve(results);
				}
			} else {
				resolve([]);
			}
		});

		child.on('error', () => {
			resolve([]);
		});

		// Timeout after 30 seconds
		setTimeout(() => {
			child.kill();
			resolve([]);
		}, 30000);
	});
}

function parseUnixOutput(output: string): LintResult[] {
	return output
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const match = line.match(/^(.+):(\d+):(\d+):\s*(error|warning|note|info)?:?\s*(.+)$/);
			if (match) {
				return {
					file: match[1],
					line: parseInt(match[2], 10),
					column: parseInt(match[3], 10),
					severity: match[4] || 'error',
					message: match[5],
				};
			}
			return null;
		})
		.filter((r): r is LintResult => r !== null);
}

function createDiagnostic(result: LintResult, document: vscode.TextDocument): vscode.Diagnostic {
	const line = Math.max(0, Math.min(result.line - 1, document.lineCount - 1));
	const column = Math.max(0, result.column - 1);

	// Get the line text to determine range
	const lineText = document.lineAt(line).text;
	const startCol = Math.min(column, lineText.length);

	// Try to find a word at the position for better highlighting
	const wordRange = document.getWordRangeAtPosition(new vscode.Position(line, startCol));
	const range = wordRange || new vscode.Range(line, startCol, line, lineText.length);

	const severity = getSeverity(result.severity);

	const diagnostic = new vscode.Diagnostic(range, result.message, severity);
	diagnostic.source = 'resist-linter';

	// Add code if message contains a rule ID
	const ruleMatch = result.message.match(/^(\w+[-/]\w+):/);
	if (ruleMatch) {
		diagnostic.code = ruleMatch[1];
	}

	return diagnostic;
}

function getSeverity(severity: string): vscode.DiagnosticSeverity {
	switch (severity.toLowerCase()) {
		case 'error':
			return vscode.DiagnosticSeverity.Error;
		case 'warning':
			return vscode.DiagnosticSeverity.Warning;
		case 'info':
		case 'note':
		case 'hint':
			return vscode.DiagnosticSeverity.Information;
		default:
			return vscode.DiagnosticSeverity.Warning;
	}
}

export function deactivate(): void {
	debounceTimers.forEach((timer) => clearTimeout(timer));
	debounceTimers.clear();
}
