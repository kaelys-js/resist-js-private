#!/usr/bin/env tsx
/**
 * resist-secrets CLI
 *
 * Main entry point for the secrets management CLI.
 * Dispatches to individual command handlers.
 */

import { argv, exit } from 'node:process';

const commands = {
	setup: () => import('./setup.ts'),
	doctor: () => import('./doctor.ts'),
	migrate: () => import('./migrate.ts'),
	sync: () => import('./sync.ts'),
	rotate: () => import('./rotate.ts'),
	help: () => Promise.resolve({ default: { main: showHelp } }),
};

type CommandName = keyof typeof commands;

function showHelp(): void {
	console.log(`
resist-secrets - Turn-key secret management for resist.js

Usage:
  resist-secrets <command> [options]

Commands:
  setup     Interactive first-time setup
  doctor    Diagnose configuration issues
  migrate   Migrate from .env files to Infisical
  sync      Manually sync secrets to Cloudflare
  rotate    Rotate secret values
  help      Show this help message

Options:
  --env=<env>     Environment (local, feature, staging, prod)
  --project=<id>  Infisical project ID
  --verbose       Show detailed output
  --dry-run       Preview changes without applying

Examples:
  resist-secrets setup
  resist-secrets doctor
  resist-secrets migrate --env=local
  resist-secrets sync --env=staging

Environment Variables:
  INFISICAL_TOKEN       Access token for authentication
  INFISICAL_PROJECT_ID  Default project ID
  INFISICAL_ENV         Default environment
  INFISICAL_SITE_URL    Infisical server URL (for self-hosted)
`);
}

async function main(): Promise<void> {
	const args = argv.slice(2);
	const command = (args[0] || 'help') as CommandName;

	if (!(command in commands)) {
		console.error(`Unknown command: ${command}`);
		console.error('Run "resist-secrets help" for available commands.');
		exit(1);
	}

	try {
		const module = await commands[command]();
		await module.default.main(args.slice(1));
	} catch (error) {
		console.error('Error:', error instanceof Error ? error.message : error);
		exit(1);
	}
}

main();

export default { main };
