#!/usr/bin/env tsx
/**
 * Setup Command
 *
 * Interactive first-time setup for developers.
 * Installs CLI, authenticates, and initializes project configuration.
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { stdin, stdout, exit } from 'node:process';
import { resolve, dirname } from 'node:path';
import { gitBranchToEnvironmentMapping } from '../config/environments.ts';
import { organization } from '../config/projects.ts';

const rl = createInterface({ input: stdin, output: stdout });

const question = (prompt: string): Promise<string> =>
	new Promise((resolve) => rl.question(prompt, resolve));

const confirm = async (prompt: string, defaultValue = true): Promise<boolean> => {
	const suffix = defaultValue ? '[Y/n]' : '[y/N]';
	const answer = await question(`${prompt} ${suffix} `);
	if (!answer) return defaultValue;
	return answer.toLowerCase().startsWith('y');
};

interface SetupOptions {
	verbose: boolean;
	skipInstall: boolean;
	skipLogin: boolean;
}

function parseArgs(args: string[]): SetupOptions {
	return {
		verbose: args.includes('--verbose') || args.includes('-v'),
		skipInstall: args.includes('--skip-install'),
		skipLogin: args.includes('--skip-login'),
	};
}

function log(message: string, verbose = false): void {
	if (verbose) {
		console.log(`  ${message}`);
	}
}

function success(message: string): void {
	console.log(`✅ ${message}`);
}

function error(message: string): void {
	console.error(`❌ ${message}`);
}

function info(message: string): void {
	console.log(`ℹ️  ${message}`);
}

function warning(message: string): void {
	console.log(`⚠️  ${message}`);
}

/**
 * Check if Infisical CLI is installed
 */
function isCliInstalled(): boolean {
	try {
		execSync('infisical --version', { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get CLI version
 */
function getCliVersion(): string {
	try {
		return execSync('infisical --version', { encoding: 'utf-8' }).trim();
	} catch {
		return 'unknown';
	}
}

/**
 * Install Infisical CLI
 */
async function installCli(options: SetupOptions): Promise<boolean> {
	const platform = process.platform;

	console.log('\n📦 Installing Infisical CLI...\n');

	let command: string;
	let args: string[];

	switch (platform) {
		case 'darwin':
			command = 'brew';
			args = ['install', 'infisical/get-cli/infisical'];
			break;
		case 'linux':
			// Use npm as fallback for cross-distro support
			command = 'npm';
			args = ['install', '-g', '@infisical/cli'];
			break;
		default:
			command = 'npm';
			args = ['install', '-g', '@infisical/cli'];
	}

	info(`Running: ${command} ${args.join(' ')}`);

	const result = spawnSync(command, args, {
		stdio: options.verbose ? 'inherit' : 'pipe',
	});

	if (result.status !== 0) {
		error('Failed to install Infisical CLI');
		console.log('\nManual installation options:');
		console.log('  macOS:   brew install infisical/get-cli/infisical');
		console.log('  Linux:   See https://infisical.com/docs/cli/overview');
		console.log('  npm:     npm install -g @infisical/cli');
		return false;
	}

	success(`Installed Infisical CLI`);
	return true;
}

/**
 * Check if user is logged in
 */
function isLoggedIn(): boolean {
	try {
		execSync('infisical user', { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Login to Infisical
 */
async function login(): Promise<boolean> {
	console.log('\n🔑 Logging in to Infisical...\n');
	info('A browser window will open for authentication.');

	const result = spawnSync('infisical', ['login'], {
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		error('Login failed');
		return false;
	}

	success('Logged in successfully');
	return true;
}

/**
 * Initialize project configuration
 */
async function initializeProject(projectId: string, options: SetupOptions): Promise<boolean> {
	const configPath = resolve(process.cwd(), '.infisical.json');

	if (existsSync(configPath)) {
		const overwrite = await confirm('.infisical.json already exists. Overwrite?', false);
		if (!overwrite) {
			info('Keeping existing configuration');
			return true;
		}
	}

	const config = {
		workspaceId: projectId,
		defaultEnvironment: 'local',
		gitBranchToEnvironmentMapping,
	};

	try {
		writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n');
		success('Created .infisical.json');
		log(`Configuration written to ${configPath}`, options.verbose);
		return true;
	} catch (e) {
		error(`Failed to create config: ${e instanceof Error ? e.message : e}`);
		return false;
	}
}

/**
 * Test connection to Infisical
 */
async function testConnection(env: string): Promise<boolean> {
	console.log('\n🔍 Testing connection...\n');

	try {
		execSync(`infisical secrets --env=${env}`, { stdio: 'pipe' });
		success('Successfully connected to Infisical');
		return true;
	} catch (e) {
		warning('Could not fetch secrets. This might be normal if the project is new.');
		return true; // Don't fail on empty projects
	}
}

/**
 * Main setup flow
 */
async function main(args: string[]): Promise<void> {
	const options = parseArgs(args);

	console.log('\n🔐 resist.js Secret Management Setup');
	console.log('=====================================\n');

	// Step 1: Check/Install CLI
	if (!options.skipInstall) {
		if (isCliInstalled()) {
			success(`Infisical CLI installed (${getCliVersion()})`);
		} else {
			const install = await confirm('Infisical CLI not found. Install it?');
			if (install) {
				const installed = await installCli(options);
				if (!installed) {
					exit(1);
				}
			} else {
				error('Infisical CLI is required. Please install it manually.');
				exit(1);
			}
		}
	}

	// Step 2: Login
	if (!options.skipLogin) {
		if (isLoggedIn()) {
			success('Already logged in to Infisical');
		} else {
			const loggedIn = await login();
			if (!loggedIn) {
				exit(1);
			}
		}
	}

	// Step 3: Get project ID
	console.log('\n📋 Project Configuration\n');

	let projectId = process.env.INFISICAL_PROJECT_ID || '';

	if (!projectId) {
		console.log('You can find your Project ID in the Infisical dashboard:');
		console.log(`  ${organization.siteUrl}/project/[your-project]/settings\n`);

		projectId = await question('Enter your Infisical Project ID: ');

		if (!projectId.trim()) {
			error('Project ID is required');
			exit(1);
		}
	} else {
		info(`Using Project ID from environment: ${projectId}`);
	}

	// Step 4: Initialize project
	const initialized = await initializeProject(projectId.trim(), options);
	if (!initialized) {
		exit(1);
	}

	// Step 5: Test connection
	await testConnection('local');

	// Done!
	console.log('\n✨ Setup complete!\n');
	console.log('Next steps:');
	console.log('  1. Run `pnpm secrets:doctor` to verify configuration');
	console.log('  2. Run `pnpm dev` to start with secrets auto-injected');
	console.log('  3. Run `pnpm secrets:edit` to manage secrets in Infisical\n');

	rl.close();
}

export default { main };
