#!/usr/bin/env tsx
/**
 * Rotate Command
 *
 * Rotates secret values with secure random generation.
 * Supports rotating single secrets or categories of secrets.
 */

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { stdin, stdout, exit } from 'node:process';
import { isValidEnvironmentSlug, type EnvironmentSlug } from '../config/environments.ts';

const rl = createInterface({ input: stdin, output: stdout });

const question = (prompt: string): Promise<string> =>
	new Promise((resolve) => rl.question(prompt, resolve));

const confirm = async (prompt: string, defaultValue = false): Promise<boolean> => {
	const suffix = defaultValue ? '[Y/n]' : '[y/N]';
	const answer = await question(`${prompt} ${suffix} `);
	if (!answer) return defaultValue;
	return answer.toLowerCase().startsWith('y');
};

interface RotateOptions {
	env: EnvironmentSlug;
	key?: string;
	category?: string;
	length: number;
	dryRun: boolean;
	verbose: boolean;
	force: boolean;
}

/**
 * Secret categories for bulk rotation
 */
const secretCategories: Record<string, string[]> = {
	jwt: ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
	api: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'REVENUECAT_API_KEY'],
	database: ['DATABASE_AUTH_TOKEN'],
	all: [], // Will be populated with all rotatable secrets
};

function parseArgs(args: string[]): RotateOptions {
	let env: EnvironmentSlug = 'local';
	let key: string | undefined;
	let category: string | undefined;
	let length = 64;

	const envArg = args.find((a) => a.startsWith('--env='));
	if (envArg) {
		const value = envArg.split('=')[1];
		if (value && isValidEnvironmentSlug(value)) {
			env = value;
		}
	}

	const keyArg = args.find((a) => a.startsWith('--key='));
	if (keyArg) {
		key = keyArg.split('=')[1];
	}

	const categoryArg = args.find((a) => a.startsWith('--category='));
	if (categoryArg) {
		category = categoryArg.split('=')[1];
	}

	const lengthArg = args.find((a) => a.startsWith('--length='));
	if (lengthArg) {
		const value = parseInt(lengthArg.split('=')[1] || '64', 10);
		if (!isNaN(value) && value >= 16 && value <= 256) {
			length = value;
		}
	}

	return {
		env,
		key,
		category,
		length,
		dryRun: args.includes('--dry-run'),
		verbose: args.includes('--verbose') || args.includes('-v'),
		force: args.includes('--force') || args.includes('-f'),
	};
}

/**
 * Generate a secure random string
 */
function generateSecret(length: number): string {
	return randomBytes(Math.ceil(length / 2))
		.toString('hex')
		.slice(0, length);
}

/**
 * Generate a URL-safe base64 secret
 */
function generateBase64Secret(length: number): string {
	return randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Get current value of a secret
 */
function getSecretValue(key: string, env: EnvironmentSlug): string | undefined {
	try {
		const output = execSync(`infisical secrets get ${key} --env=${env} --plain`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		return output.trim();
	} catch {
		return undefined;
	}
}

/**
 * Set a new secret value
 */
function setSecretValue(key: string, value: string, env: EnvironmentSlug, dryRun: boolean): boolean {
	if (dryRun) {
		return true;
	}

	try {
		execSync(`infisical secrets set "${key}=${value}" --env=${env}`, {
			stdio: 'pipe',
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * List all secrets in an environment
 */
function listSecrets(env: EnvironmentSlug): string[] {
	try {
		const output = execSync(`infisical secrets --env=${env} --format=json`, {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		const secrets = JSON.parse(output);
		return secrets.map((s: { key: string }) => s.key);
	} catch {
		return [];
	}
}

/**
 * Main rotation flow
 */
async function main(args: string[]): Promise<void> {
	const options = parseArgs(args);

	console.log('\n🔄 Rotate Secrets\n');
	console.log('='.repeat(50) + '\n');

	if (options.dryRun) {
		console.log('🔍 DRY RUN MODE - No changes will be made\n');
	}

	// Determine which secrets to rotate
	let keysToRotate: string[] = [];

	if (options.key) {
		keysToRotate = [options.key];
	} else if (options.category) {
		if (options.category === 'all') {
			// Get all secrets from the environment
			keysToRotate = listSecrets(options.env);
		} else if (options.category in secretCategories) {
			keysToRotate = secretCategories[options.category]!;
		} else {
			console.error(`❌ Unknown category: ${options.category}`);
			console.log('\nAvailable categories:');
			for (const cat of Object.keys(secretCategories)) {
				console.log(`  - ${cat}`);
			}
			rl.close();
			exit(1);
		}
	} else {
		// Interactive mode - ask user which secrets to rotate
		console.log('Available categories:');
		for (const [cat, keys] of Object.entries(secretCategories)) {
			if (cat !== 'all') {
				console.log(`  - ${cat}: ${keys.join(', ')}`);
			}
		}
		console.log('  - all: All secrets in the environment');
		console.log('');

		const category = await question('Enter category to rotate (or secret key): ');

		if (category in secretCategories) {
			if (category === 'all') {
				keysToRotate = listSecrets(options.env);
			} else {
				keysToRotate = secretCategories[category]!;
			}
		} else {
			keysToRotate = [category];
		}
	}

	if (keysToRotate.length === 0) {
		console.log('No secrets to rotate.\n');
		rl.close();
		return;
	}

	// Display what will be rotated
	console.log(`Secrets to rotate in ${options.env} environment:\n`);
	for (const key of keysToRotate) {
		const currentValue = getSecretValue(key, options.env);
		const status = currentValue ? '(exists)' : '(not set)';
		console.log(`  - ${key} ${status}`);
	}
	console.log('');

	// Confirm rotation
	if (!options.force && !options.dryRun) {
		const proceed = await confirm(
			`⚠️  This will generate new values for ${keysToRotate.length} secret(s). Continue?`
		);
		if (!proceed) {
			console.log('\nRotation cancelled.\n');
			rl.close();
			exit(0);
		}
	}

	// Rotate each secret
	let rotated = 0;
	let failed = 0;
	const newValues: Record<string, string> = {};

	console.log('\nRotating secrets...\n');

	for (const key of keysToRotate) {
		// Generate appropriate secret based on key name
		let newValue: string;

		if (key.includes('JWT') || key.includes('SECRET')) {
			// Use longer secrets for JWT/cryptographic keys
			newValue = generateBase64Secret(Math.max(options.length, 64));
		} else if (key.includes('TOKEN') || key.includes('KEY')) {
			newValue = generateSecret(options.length);
		} else {
			newValue = generateSecret(options.length);
		}

		if (options.verbose || options.dryRun) {
			console.log(`  ${key}: ${newValue.slice(0, 16)}...`);
		}

		const success = setSecretValue(key, newValue, options.env, options.dryRun);

		if (success) {
			rotated++;
			newValues[key] = newValue;
			if (!options.verbose && !options.dryRun) {
				process.stdout.write('.');
			}
		} else {
			failed++;
			console.log(`  ❌ Failed to rotate ${key}`);
		}
	}

	if (!options.verbose && !options.dryRun) {
		console.log(''); // New line after dots
	}

	// Summary
	console.log('\n' + '='.repeat(50));
	console.log(`\n📊 Rotation Summary:`);
	console.log(`   Environment: ${options.env}`);
	console.log(`   Rotated: ${rotated}`);
	console.log(`   Failed: ${failed}`);

	if (options.dryRun) {
		console.log('\n🔍 This was a dry run. Remove --dry-run to apply changes.\n');
	} else {
		console.log('\n✨ Rotation complete!\n');
		console.log('⚠️  Important: Update any services using these secrets.');
		console.log('   Secrets synced to Cloudflare Workers will update automatically.\n');
	}

	rl.close();
}

export default { main };
