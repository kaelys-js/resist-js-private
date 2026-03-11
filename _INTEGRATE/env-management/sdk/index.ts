/**
 * @resist/infisical
 *
 * Turn-key secret management for resist.js monorepo.
 * Re-exports all public APIs.
 */

// Client
export { getClient, createClient, type InfisicalClientOptions } from './client.ts';

// Secret fetching
export {
	getSecrets,
	getSecret,
	getGlobalSecrets,
	getProductSecrets,
	getAllSecrets,
	type GetSecretsOptions,
} from './secrets.ts';

// Cloudflare Workers integration
export { validateEnv, createSecretsProxy, type CloudflareEnv } from './cloudflare.ts';

// Configuration
export {
	type Environment,
	type EnvironmentSlug,
	type EnvironmentConfig,
	environments,
	getEnvironmentBySlug,
	getEnvironmentFromBranch,
	detectEnvironment,
	isValidEnvironmentSlug,
} from '../config/environments.ts';

// Schemas
export {
	GlobalSecretsSchema,
	ProductSecretsSchema,
	AllSecretsSchema,
	validateSecrets,
	validatePartialSecrets,
	getRequiredKeys,
	getAllKeys,
	type GlobalSecrets,
	type ProductSecrets,
	type AllSecrets,
} from '../config/schemas.ts';

// Projects
export {
	type ProjectConfig,
	type OrganizationConfig,
	globalProject,
	allProjects,
	getProjectBySlug,
	createProductProject,
	organization,
} from '../config/projects.ts';
