#!/usr/bin/env tsx
/**
 * Migrate Command
 *
 * Migrates existing .env files to Infisical.
 * Supports dry-run mode for previewing changes.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, renameSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createInterface } from 'node:readline';
import { stdin, stdout, exit } from 'node:process';
import { isValidEnvironmentSlug, type EnvironmentSlug } from '../config/environments.ts';

const rl = createInterface({ input: stdin, output: stdout });

const question = (prompt: string): Promise<string> =>
	new Promise((resolve) => rl.question(prompt, resolve));

const confirm = async (prompt: string, defaultValue = true): Promise<boolean> => {
	const suffix = defaultValue ? '[Y/n]' : '[y/N]';
	const answer = await question(`${prompt} ${suffix} `);
	if (!answer) return defaultValue;
	return answer.toLowerCase().startsWith('y');
};

interface MigrateOptions {
	env: EnvironmentSlug;
	dryRun: boolean;
	verbose: boolean;
	backup: boolean;
	deleteAfter: boolean;
}

interface EnvEntry {
	key: string;
	value: string;
	line: number;
	comment?: string;
}

function parseArgs(args: string[]): MigrateOptions {
	let env: EnvironmentSlug = 'local';

	const envArg = args.find((a) => a.startsWith('--env='));
	if (envArg) {
		const value = envArg.split('=')[1];
		if (value && isValidEnvironmentSlug(value)) {
			env = value;
		}
	}

	return {
		env,
		dryRun: args.includes('--dry-run'),
		verbose: args.includes('--verbose') || args.includes('-v'),
		backup: !args.includes('--no-backup'),
		deleteAfter: args.includes('--delete'),
	};
}

/**
 * Parse a .env file into key-value entries
 */
function parseEnvFile(filePath: string): EnvEntry[] {
	const content = readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');
	const entries: EnvEntry[] = [];
	let lastComment: string | undefined;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!.trim();

		// Skip empty lines
		if (!line) {
			lastComment = undefined;
			continue;
		}

		// Capture comments
		if (line.startsWith('#')) {
			lastComment = line.slice(1).trim();
			continue;
		}

		// Parse KEY=value
		const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (match) {
			let value = match[2] || '';

			// Remove surrounding quotes
			if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}

			entries.push({
				key: match[1]!,
				value,
				line: i + 1,
				comment: lastComment,
			});

			lastComment = undefined;
		}
	}

	return entries;
}

/**
 * Find all .env files in the current directory
 */
function findEnvFiles(): string[] {
	const patterns = [
		'.env',
		'.env.local',
		'.env.development',
		'.env.development.local',
		'.env.staging',
		'.env.staging.local',
		'.env.production',
		'.env.production.local',
		'.env.test',
		'.env.test.local',
	];

	const cwd = process.cwd();
	const found: string[] = [];

	for (const pattern of patterns) {
		const path = resolve(cwd, pattern);
		if (existsSync(path)) {
			found.push(path);
		}
	}

	return found;
}

/**
 * Map .env file name to Infisical environment
 */
function mapFileToEnvironment(fileName: string): EnvironmentSlug {
	const name = basename(fileName).toLowerCase();

	if (name.includes('production') || name.includes('prod')) {
		return 'prod';
	}
	if (name.includes('staging') || name.includes('stag')) {
		return 'staging';
	}
	if (name.includes('development') || name.includes('dev')) {
		return 'feature';
	}
	if (name.includes('test')) {
		return 'local';
	}

	return 'local';
}

/**
 * Upload a secret to Infisical
 */
function uploadSecret(key: string, value: string, env: EnvironmentSlug, dryRun: boolean): boolean {
	const command = `infisical secrets set "${key}=${value}" --env=${env}`;

	if (dryRun) {
		console.log(`  [DRY-RUN] ${command.replace(value, '***')}`);
		return true;
	}

	try {
		execSync(command, { stdio: 'pipe' });
		return true;
	} catch (e) {
		console.error(`  ❌ Failed to set ${key}: ${e instanceof Error ? e.message : e}`);
		return false;
	}
}

/**
 * Main migration flow
 */
async function main(args: string[]): Promise<void> {
	const options = parseArgs(args);

	console.log('\n🔄 Migrate .env to Infisical\n');
	console.log('='.repeat(50) + '\n');

	if (options.dryRun) {
		console.log('🔍 DRY RUN MODE - No changes will be made\n');
	}

	// Find .env files
	const envFiles = findEnvFiles();

	if (envFiles.length === 0) {
		console.log('No .env files found in the current directory.\n');
		rl.close();
		return;
	}

	console.log(`Found ${envFiles.length} .env file(s):\n`);
	for (const file of envFiles) {
		const env = mapFileToEnvironment(file);
		console.log(`  - ${basename(file)} → ${env} environment`);
	}
	console.log('');

	// Confirm migration
	if (!options.dryRun) {
		const proceed = await confirm('Proceed with migration?');
		if (!proceed) {
			console.log('\nMigration cancelled.\n');
			rl.close();
			exit(0);
		}
	}

	let totalMigrated = 0;
	let totalFailed = 0;

	// Process each file
	for (const file of envFiles) {
		const fileName = basename(file);
		const targetEnv = mapFileToEnvironment(file);

		console.log(`\n📄 Processing ${fileName} → ${targetEnv}:\n`);

		const entries = parseEnvFile(file);

		if (entries.length === 0) {
			console.log('  No entries found.\n');
			continue;
		}

		// Filter out sensitive-looking keys for review
		const sensitivePatterns = [/password/i, /secret/i, /key/i, /token/i, /api/i, /private/i];
		const sensitiveEntries = entries.filter((e) => sensitivePatterns.some((p) => p.test(e.key)));

		if (sensitiveEntries.length > 0 && !options.dryRun) {
			console.log(`  ⚠️  Found ${sensitiveEntries.length} potentially sensitive value(s):`);
			for (const entry of sensitiveEntries) {
				console.log(`     - ${entry.key}`);
			}
			const confirmSensitive = await confirm('  Continue with these sensitive values?');
			if (!confirmSensitive) {
				console.log('  Skipping this file.\n');
				continue;
			}
		}

		// Upload each entry
		for (const entry of entries) {
			if (options.verbose) {
				console.log(`  ${entry.key}=${entry.value.slice(0, 20)}${entry.value.length > 20 ? '...' : ''}`);
			}

			const success = uploadSecret(entry.key, entry.value, targetEnv, options.dryRun);

			if (success) {
				totalMigrated++;
				if (!options.verbose) {
					process.stdout.write('.');
				}
			} else {
				totalFailed++;
			}
		}

		if (!options.verbose) {
			console.log(''); // New line after dots
		}

		// Backup or delete the file
		if (!options.dryRun) {
			if (options.backup) {
				const backupPath = `${file}.bak`;
				renameSync(file, backupPath);
				console.log(`  📦 Backed up to ${basename(backupPath)}`);
			} else if (options.deleteAfter) {
				unlinkSync(file);
				console.log(`  🗑️  Deleted ${fileName}`);
			}
		}
	}

	// Summary
	console.log('\n' + '='.repeat(50));
	console.log(`\n📊 Migration Summary:`);
	console.log(`   Migrated: ${totalMigrated} secrets`);
	console.log(`   Failed:   ${totalFailed} secrets`);

	if (options.dryRun) {
		console.log('\n🔍 This was a dry run. Run without --dry-run to apply changes.\n');
	} else {
		console.log('\n✨ Migration complete!\n');
		console.log('Next steps:');
		console.log('  1. Run `pnpm secrets:doctor` to verify');
		console.log('  2. Delete .env.bak files after confirming everything works');
		console.log('  3. Update .gitignore to remove .env* patterns\n');
	}

	rl.close();
}

export default { main };
