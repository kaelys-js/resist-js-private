/**
 * Environment Definitions
 *
 * Defines the available environments and their configurations.
 * Used for mapping git branches to environments and configuring
 * Cloudflare zone associations.
 *
 * Environments:
 * - local: Developer's local machine
 * - feature: Feature branch testing (ephemeral)
 * - staging: Pre-production testing and QA
 * - production: Live production environment
 */

import * as v from 'valibot';

/**
 * Valid environment identifiers
 */
export const EnvironmentSchema = v.picklist(['local', 'feature', 'staging', 'production']);
export type Environment = v.InferOutput<typeof EnvironmentSchema>;

/**
 * Short environment slugs used by Infisical
 */
export const EnvironmentSlugSchema = v.picklist(['local', 'feature', 'staging', 'prod']);
export type EnvironmentSlug = v.InferOutput<typeof EnvironmentSlugSchema>;

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
	/** Full environment name */
	readonly name: Environment;
	/** Short slug for Infisical */
	readonly slug: EnvironmentSlug;
	/** Human-readable description */
	readonly description: string;
	/** Associated Cloudflare zone pattern */
	readonly cloudflareZonePattern: string;
	/** Git branches that map to this environment */
	readonly gitBranches: readonly string[];
	/** Whether this is a production-like environment */
	readonly isProduction: boolean;
	/** Whether this environment is ephemeral (auto-cleanup) */
	readonly isEphemeral: boolean;
	/** Default secrets inheritance (which env to copy from) */
	readonly inheritsFrom?: EnvironmentSlug;
}

/**
 * Environment configurations
 */
export const environments: Record<Environment, EnvironmentConfig> = {
	local: {
		name: 'local',
		slug: 'local',
		description: 'Developer local machine',
		cloudflareZonePattern: 'localhost',
		gitBranches: [], // Not tied to git branches
		isProduction: false,
		isEphemeral: false,
		inheritsFrom: 'feature', // Local inherits from feature by default
	},
	feature: {
		name: 'feature',
		slug: 'feature',
		description: 'Feature branch testing (ephemeral)',
		cloudflareZonePattern: '*-preview.app',
		gitBranches: ['feature/*', 'fix/*', 'chore/*', 'refactor/*', 'docs/*', 'test/*'],
		isProduction: false,
		isEphemeral: true,
		inheritsFrom: 'staging', // Feature branches inherit from staging
	},
	staging: {
		name: 'staging',
		slug: 'staging',
		description: 'Pre-production testing and QA',
		cloudflareZonePattern: '*-staging.app',
		gitBranches: ['staging', 'develop', 'release/*'],
		isProduction: false,
		isEphemeral: false,
	},
	production: {
		name: 'production',
		slug: 'prod',
		description: 'Live production environment',
		cloudflareZonePattern: '*.app',
		gitBranches: ['main', 'master'],
		isProduction: true,
		isEphemeral: false,
	},
} as const;

/**
 * Git branch to environment mapping for .infisical.json
 */
export const gitBranchToEnvironmentMapping: Record<string, EnvironmentSlug> = {
	// Production
	main: 'prod',
	master: 'prod',

	// Staging
	staging: 'staging',
	develop: 'staging',
	'release/*': 'staging',

	// Feature (ephemeral)
	'feature/*': 'feature',
	'fix/*': 'feature',
	'chore/*': 'feature',
	'refactor/*': 'feature',
	'docs/*': 'feature',
	'test/*': 'feature',

	// Default fallback to local for unmatched branches
	'*': 'local',
};

/**
 * Environment hierarchy (for secret inheritance)
 * Secrets flow down: prod -> staging -> feature -> local
 */
export const environmentHierarchy: readonly EnvironmentSlug[] = ['prod', 'staging', 'feature', 'local'];

/**
 * Get environment config by slug
 */
export function getEnvironmentBySlug(slug: EnvironmentSlug): EnvironmentConfig {
	const entry = Object.values(environments).find((env) => env.slug === slug);
	if (!entry) {
		throw new Error(`Unknown environment slug: ${slug}`);
	}
	return entry;
}

/**
 * Get environment slug from git branch name
 */
export function getEnvironmentFromBranch(branch: string): EnvironmentSlug {
	// Check exact matches first
	if (branch in gitBranchToEnvironmentMapping) {
		return gitBranchToEnvironmentMapping[branch]!;
	}

	// Check pattern matches
	for (const [pattern, slug] of Object.entries(gitBranchToEnvironmentMapping)) {
		if (pattern.endsWith('/*')) {
			const prefix = pattern.slice(0, -2);
			if (branch.startsWith(`${prefix}/`)) {
				return slug;
			}
		}
	}

	// Default to local
	return 'local';
}

/**
 * Validate environment slug
 */
export function isValidEnvironmentSlug(slug: string): slug is EnvironmentSlug {
	return v.safeParse(EnvironmentSlugSchema, slug).success;
}

/**
 * Get parent environment for inheritance
 */
export function getParentEnvironment(slug: EnvironmentSlug): EnvironmentSlug | undefined {
	const config = getEnvironmentBySlug(slug);
	return config.inheritsFrom;
}

/**
 * Get all environments that inherit from a given environment
 */
export function getChildEnvironments(slug: EnvironmentSlug): EnvironmentSlug[] {
	return Object.values(environments)
		.filter((env) => env.inheritsFrom === slug)
		.map((env) => env.slug);
}

/**
 * Check if an environment is allowed to access another's secrets
 * (for inheritance/fallback purposes)
 */
export function canAccessEnvironment(requestingEnv: EnvironmentSlug, targetEnv: EnvironmentSlug): boolean {
	const requestingIdx = environmentHierarchy.indexOf(requestingEnv);
	const targetIdx = environmentHierarchy.indexOf(targetEnv);

	// Can access same level or higher in hierarchy (more restricted)
	return requestingIdx >= targetIdx;
}

/**
 * Get the current environment based on various signals
 */
export function detectEnvironment(): EnvironmentSlug {
	// Explicit environment variable takes precedence
	const explicitEnv = process.env.INFISICAL_ENV || process.env.NODE_ENV;
	if (explicitEnv && isValidEnvironmentSlug(explicitEnv)) {
		return explicitEnv;
	}

	// Check for CI environment
	if (process.env.CI === 'true') {
		// Try to detect from git branch in CI
		const branch = process.env.GITHUB_REF_NAME || process.env.GITHUB_HEAD_REF || process.env.CI_COMMIT_BRANCH;
		if (branch) {
			return getEnvironmentFromBranch(branch);
		}
		return 'staging'; // Default CI to staging
	}

	// Default to local for non-CI environments
	return 'local';
}
