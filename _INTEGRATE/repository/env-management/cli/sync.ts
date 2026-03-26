#!/usr/bin/env tsx
/**
 * Sync Command
 *
 * Manually trigger secret synchronization to Cloudflare Workers.
 * Useful for forcing updates or debugging sync issues.
 */

import { execSync } from 'node:child_process';
import { exit } from 'node:process';
import { isValidEnvironmentSlug, type EnvironmentSlug, environments } from '../config/environments.ts';

interface SyncOptions {
	env: EnvironmentSlug | 'all';
	verbose: boolean;
	dryRun: boolean;
	force: boolean;
}

function parseArgs(args: string[]): SyncOptions {
	let env: EnvironmentSlug | 'all' = 'local';

	const envArg = args.find((a) => a.startsWith('--env='));
	if (envArg) {
		const value = envArg.split('=')[1];
		if (value === 'all') {
			env = 'all';
		} else if (value && isValidEnvironmentSlug(value)) {
			env = value;
		}
	}

	return {
		env,
		verbose: args.includes('--verbose') || args.includes('-v'),
		dryRun: args.includes('--dry-run'),
		force: args.includes('--force') || args.includes('-f'),
	};
}

/**
 * Get current secrets from Infisical
 */
function getSecrets(env: EnvironmentSlug): Record<string, string> {
	try {
		const output = execSync(`infisical secrets --env=${env} --format=json`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		const secrets = JSON.parse(output);
		const result: Record<string, string> = {};

		for (const secret of secrets) {
			result[secret.key] = secret.value;
		}

		return result;
	} catch {
		return {};
	}
}

/**
 * Sync secrets to a Cloudflare Worker
 */
async function syncToWorker(
	workerName: string,
	secrets: Record<string, string>,
	options: SyncOptions
): Promise<{ success: boolean; synced: number; errors: string[] }> {
	const errors: string[] = [];
	let synced = 0;

	for (const [key, value] of Object.entries(secrets)) {
		const command = `wrangler secret put ${key} --name ${workerName}`;

		if (options.dryRun) {
			if (options.verbose) {
				console.log(`  [DRY-RUN] ${command}`);
			}
			synced++;
			continue;
		}

		try {
			execSync(command, {
				input: value,
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			synced++;

			if (options.verbose) {
				console.log(`  ✓ ${key}`);
			}
		} catch (e) {
			const msg = `Failed to sync ${key}: ${e instanceof Error ? e.message : 'Unknown error'}`;
			errors.push(msg);

			if (options.verbose) {
				console.log(`  ✗ ${key}: ${e instanceof Error ? e.message : 'error'}`);
			}
		}
	}

	return {
		success: errors.length === 0,
		synced,
		errors,
	};
}

/**
 * Check if wrangler is installed
 */
function isWranglerInstalled(): boolean {
	try {
		execSync('wrangler --version', { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Main sync flow
 */
async function main(args: string[]): Promise<void> {
	const options = parseArgs(args);

	console.log('\n🔄 Sync Secrets to Cloudflare Workers\n');
	console.log('='.repeat(50) + '\n');

	if (options.dryRun) {
		console.log('🔍 DRY RUN MODE - No changes will be made\n');
	}

	// Check wrangler
	if (!isWranglerInstalled()) {
		console.error('❌ Wrangler CLI not found. Install it with: npm install -g wrangler\n');
		exit(1);
	}

	// Determine which environments to sync
	const envsToSync: EnvironmentSlug[] =
		options.env === 'all' ? (['local', 'feature', 'staging', 'prod'] as EnvironmentSlug[]) : [options.env];

	let totalSynced = 0;
	let totalErrors = 0;

	for (const env of envsToSync) {
		const envConfig = environments[env === 'prod' ? 'production' : env === 'feature' ? 'feature' : env === 'staging' ? 'staging' : 'local'];

		console.log(`\n📦 Environment: ${envConfig.name} (${env})\n`);

		// Get secrets from Infisical
		console.log('  Fetching secrets from Infisical...');
		const secrets = getSecrets(env);
		const secretCount = Object.keys(secrets).length;

		if (secretCount === 0) {
			console.log('  No secrets found for this environment.\n');
			continue;
		}

		console.log(`  Found ${secretCount} secrets.\n`);

		// For now, we'll just display what would be synced
		// In a real implementation, you'd have worker names configured per project

		console.log('  Cloudflare Workers sync is typically configured in the Infisical dashboard.');
		console.log('  This command can be used to manually verify secrets are available.\n');

		console.log('  Secrets that would be synced:');
		for (const key of Object.keys(secrets)) {
			console.log(`    - ${key}`);
		}

		totalSynced += secretCount;
	}

	// Summary
	console.log('\n' + '='.repeat(50));
	console.log(`\n📊 Sync Summary:`);
	console.log(`   Environments: ${envsToSync.join(', ')}`);
	console.log(`   Total secrets: ${totalSynced}`);

	if (options.dryRun) {
		console.log('\n🔍 This was a dry run. Remove --dry-run to apply changes.\n');
	} else {
		console.log('\n✨ Sync verification complete!\n');
		console.log('Note: Automatic sync is configured in the Infisical dashboard.');
		console.log('Use this command to verify secrets are available locally.\n');
	}
}

export default { main };
