#!/usr/bin/env tsx
/**
 * Doctor Command
 *
 * Diagnoses configuration issues and validates the setup.
 * Provides actionable fixes for common problems.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { exit } from 'node:process';
import { isValidEnvironmentSlug, gitBranchToEnvironmentMapping } from '../config/environments.ts';
import { organization } from '../config/projects.ts';
import { ENV_VARS } from '../sdk/client.ts';

interface Check {
	name: string;
	description: string;
	check: () => CheckResult;
	fix?: string;
	critical?: boolean;
}

interface CheckResult {
	passed: boolean;
	message?: string;
	details?: string[];
}

interface DoctorOptions {
	verbose: boolean;
	fix: boolean;
}

function parseArgs(args: string[]): DoctorOptions {
	return {
		verbose: args.includes('--verbose') || args.includes('-v'),
		fix: args.includes('--fix'),
	};
}

/**
 * All diagnostic checks
 */
const checks: Check[] = [
	{
		name: 'Infisical CLI',
		description: 'Check if Infisical CLI is installed',
		critical: true,
		check: () => {
			try {
				const version = execSync('infisical --version', { encoding: 'utf-8' }).trim();
				return { passed: true, message: version };
			} catch {
				return { passed: false };
			}
		},
		fix: 'brew install infisical/get-cli/infisical',
	},
	{
		name: 'CLI Authentication',
		description: 'Check if logged in to Infisical',
		critical: true,
		check: () => {
			try {
				execSync('infisical user', { stdio: 'pipe' });
				return { passed: true, message: 'Authenticated' };
			} catch {
				return { passed: false };
			}
		},
		fix: 'infisical login',
	},
	{
		name: 'Configuration File',
		description: 'Check if .infisical.json exists',
		critical: true,
		check: () => {
			const configPath = resolve(process.cwd(), '.infisical.json');
			if (existsSync(configPath)) {
				return { passed: true, message: configPath };
			}
			return { passed: false };
		},
		fix: 'pnpm secrets:setup',
	},
	{
		name: 'Configuration Valid',
		description: 'Check if .infisical.json is valid JSON with required fields',
		check: () => {
			const configPath = resolve(process.cwd(), '.infisical.json');
			if (!existsSync(configPath)) {
				return { passed: false, message: 'File does not exist' };
			}

			try {
				const content = readFileSync(configPath, 'utf-8');
				const config = JSON.parse(content);

				const issues: string[] = [];

				if (!config.workspaceId) {
					issues.push('Missing workspaceId');
				}

				if (!config.defaultEnvironment) {
					issues.push('Missing defaultEnvironment');
				} else if (!isValidEnvironmentSlug(config.defaultEnvironment)) {
					issues.push(`Invalid defaultEnvironment: ${config.defaultEnvironment}`);
				}

				if (!config.gitBranchToEnvironmentMapping) {
					issues.push('Missing gitBranchToEnvironmentMapping');
				}

				if (issues.length > 0) {
					return { passed: false, details: issues };
				}

				return { passed: true, message: `Project: ${config.workspaceId}` };
			} catch (e) {
				return { passed: false, message: e instanceof Error ? e.message : 'Parse error' };
			}
		},
		fix: 'pnpm secrets:setup',
	},
	{
		name: 'Environment Variables',
		description: 'Check for recommended environment variables',
		check: () => {
			const defined: string[] = [];
			const missing: string[] = [];

			for (const [name, envVar] of Object.entries(ENV_VARS)) {
				if (process.env[envVar]) {
					defined.push(name);
				} else {
					missing.push(name);
				}
			}

			// Only PROJECT_ID and ENV are recommended for local dev
			const recommended = ['PROJECT_ID', 'ENV'];
			const missingRecommended = recommended.filter((r) => missing.includes(r));

			if (missingRecommended.length > 0) {
				return {
					passed: true, // Not critical
					message: 'Some optional vars not set',
					details: missingRecommended.map((r) => `${r} (${ENV_VARS[r as keyof typeof ENV_VARS]})`),
				};
			}

			return { passed: true, message: `${defined.length} configured` };
		},
	},
	{
		name: 'Secret Fetch',
		description: 'Check if secrets can be fetched from Infisical',
		check: () => {
			try {
				execSync('infisical secrets --env=local 2>&1', { stdio: 'pipe' });
				return { passed: true, message: 'Secrets accessible' };
			} catch (e) {
				const output = e instanceof Error && 'stdout' in e ? String(e.stdout) : '';
				if (output.includes('no secrets')) {
					return { passed: true, message: 'No secrets (project may be empty)' };
				}
				return { passed: false, message: 'Could not fetch secrets' };
			}
		},
		fix: 'Check project permissions in Infisical dashboard',
	},
	{
		name: 'No .env Files',
		description: 'Check that no .env files exist (secrets should be in Infisical)',
		check: () => {
			const envPatterns = ['.env', '.env.local', '.env.development', '.env.staging', '.env.production', '.env.test'];

			const found: string[] = [];
			const cwd = process.cwd();

			for (const pattern of envPatterns) {
				const path = resolve(cwd, pattern);
				if (existsSync(path)) {
					found.push(pattern);
				}
			}

			if (found.length > 0) {
				return {
					passed: false,
					message: `Found ${found.length} .env file(s)`,
					details: found,
				};
			}

			return { passed: true, message: 'No .env files found' };
		},
		fix: 'pnpm secrets:migrate && rm .env*',
	},
	{
		name: 'Git Ignored',
		description: 'Check that .infisical.json is NOT in .gitignore (it should be committed)',
		check: () => {
			const gitignorePath = resolve(process.cwd(), '.gitignore');
			if (!existsSync(gitignorePath)) {
				return { passed: true, message: 'No .gitignore found' };
			}

			const content = readFileSync(gitignorePath, 'utf-8');
			const lines = content.split('\n').map((l) => l.trim());

			if (lines.includes('.infisical.json')) {
				return { passed: false, message: '.infisical.json is gitignored (it should be committed)' };
			}

			return { passed: true, message: '.infisical.json will be committed' };
		},
		fix: 'Remove .infisical.json from .gitignore',
	},
	{
		name: 'Infisical Site',
		description: 'Check connectivity to Infisical server',
		check: () => {
			const siteUrl = process.env.INFISICAL_SITE_URL || organization.siteUrl;

			try {
				// Simple connectivity check
				execSync(`curl -sf -o /dev/null -w "%{http_code}" "${siteUrl}/api/status"`, {
					stdio: 'pipe',
					timeout: 5000,
				});
				return { passed: true, message: siteUrl };
			} catch {
				return { passed: false, message: `Cannot reach ${siteUrl}` };
			}
		},
		fix: 'Check network connectivity or INFISICAL_SITE_URL',
	},
];

/**
 * Run all checks and display results
 */
async function main(args: string[]): Promise<void> {
	const options = parseArgs(args);

	console.log('\n🩺 Infisical Health Check\n');
	console.log('='.repeat(50) + '\n');

	let passed = 0;
	let failed = 0;
	let warnings = 0;
	const failures: { check: Check; result: CheckResult }[] = [];

	for (const check of checks) {
		const result = check.check();

		const icon = result.passed ? '✅' : check.critical ? '❌' : '⚠️';
		const status = result.passed ? 'OK' : check.critical ? 'FAIL' : 'WARN';

		console.log(`${icon} ${check.name}`);

		if (options.verbose) {
			console.log(`   ${check.description}`);
		}

		if (result.message) {
			console.log(`   ${result.message}`);
		}

		if (result.details && result.details.length > 0) {
			for (const detail of result.details) {
				console.log(`   - ${detail}`);
			}
		}

		if (result.passed) {
			passed++;
		} else if (check.critical) {
			failed++;
			failures.push({ check, result });
		} else {
			warnings++;
			if (!result.passed && check.fix) {
				failures.push({ check, result });
			}
		}

		console.log('');
	}

	// Summary
	console.log('='.repeat(50));
	console.log(`\n📊 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings\n`);

	// Show fixes for failures
	if (failures.length > 0) {
		console.log('🔧 Suggested Fixes:\n');
		for (const { check } of failures) {
			if (check.fix) {
				console.log(`   ${check.name}:`);
				console.log(`   $ ${check.fix}\n`);
			}
		}
	}

	// Exit with error if critical checks failed
	if (failed > 0) {
		console.log('❌ Some critical checks failed. Please fix the issues above.\n');
		exit(1);
	}

	if (warnings > 0) {
		console.log('⚠️  Some checks have warnings. Consider addressing them.\n');
	} else {
		console.log('✨ All checks passed! Your setup is healthy.\n');
	}
}

export default { main };
