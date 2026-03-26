/**
 * Secret Fetching
 *
 * Type-safe functions for fetching secrets from Infisical.
 * Supports validation, caching, and environment-specific retrieval.
 */

import type { GenericSchema, InferOutput } from 'valibot';
import { getClient } from './client.ts';
import { detectEnvironment, type EnvironmentSlug } from '../config/environments.ts';
import {
	GlobalSecretsSchema,
	ProductSecretsSchema,
	AllSecretsSchema,
	validateSecrets,
	type GlobalSecrets,
	type ProductSecrets,
	type AllSecrets,
} from '../config/schemas.ts';

/**
 * Options for fetching secrets
 */
export interface GetSecretsOptions {
	/** Environment to fetch from (auto-detected if not provided) */
	environment?: EnvironmentSlug;

	/** Infisical project ID (falls back to INFISICAL_PROJECT_ID env var) */
	projectId?: string;

	/** Folder path within the project */
	path?: string;

	/** Whether to attach secrets to process.env */
	attachToProcessEnv?: boolean;

	/** Whether to include imported secrets */
	includeImports?: boolean;

	/** Skip schema validation */
	skipValidation?: boolean;

	/** Tag slugs to filter by */
	tags?: string[];
}

/**
 * Secret entry from Infisical
 */
interface SecretEntry {
	secretKey: string;
	secretValue: string;
	type: string;
	version: number;
}

/**
 * Fetch and validate secrets against a schema
 */
export async function getSecrets<T extends GenericSchema>(
	schema: T,
	options: GetSecretsOptions = {}
): Promise<InferOutput<T>> {
	const client = getClient();
	const environment = options.environment || detectEnvironment();
	const projectId = options.projectId || process.env.INFISICAL_PROJECT_ID;

	if (!projectId) {
		throw new Error('Project ID is required. Set INFISICAL_PROJECT_ID or pass projectId option.');
	}

	const secrets = (await client.listSecrets({
		environment,
		projectId,
		path: options.path || '/',
		includeImports: options.includeImports ?? true,
		...(options.tags && { tagSlugs: options.tags }),
	})) as SecretEntry[];

	// Convert array to object
	const secretsObj = secrets.reduce(
		(acc, secret) => {
			acc[secret.secretKey] = secret.secretValue;
			return acc;
		},
		{} as Record<string, string>
	);

	// Optionally attach to process.env
	if (options.attachToProcessEnv) {
		for (const [key, value] of Object.entries(secretsObj)) {
			process.env[key] = value;
		}
	}

	// Validate and return
	if (options.skipValidation) {
		return secretsObj as InferOutput<T>;
	}

	return validateSecrets(schema, secretsObj);
}

/**
 * Fetch a single secret value
 */
export async function getSecret(
	key: string,
	options: Omit<GetSecretsOptions, 'attachToProcessEnv'> = {}
): Promise<string | undefined> {
	const client = getClient();
	const environment = options.environment || detectEnvironment();
	const projectId = options.projectId || process.env.INFISICAL_PROJECT_ID;

	if (!projectId) {
		throw new Error('Project ID is required. Set INFISICAL_PROJECT_ID or pass projectId option.');
	}

	try {
		const secret = (await client.getSecret({
			environment,
			projectId,
			secretName: key,
			path: options.path || '/',
			includeImports: options.includeImports ?? true,
		})) as SecretEntry | null;

		return secret?.secretValue;
	} catch {
		return undefined;
	}
}

/**
 * Fetch global secrets (shared across products)
 */
export async function getGlobalSecrets(options: Omit<GetSecretsOptions, 'path'> = {}): Promise<GlobalSecrets> {
	return getSecrets(GlobalSecretsSchema, {
		...options,
		path: '/',
	});
}

/**
 * Fetch product-specific secrets
 */
export async function getProductSecrets(options: GetSecretsOptions = {}): Promise<ProductSecrets> {
	return getSecrets(ProductSecretsSchema, options);
}

/**
 * Fetch all secrets (global + product)
 */
export async function getAllSecrets(options: GetSecretsOptions = {}): Promise<AllSecrets> {
	return getSecrets(AllSecretsSchema, options);
}

/**
 * Check if a secret exists
 */
export async function hasSecret(key: string, options: Omit<GetSecretsOptions, 'attachToProcessEnv'> = {}): Promise<boolean> {
	const value = await getSecret(key, options);
	return value !== undefined;
}

/**
 * Get multiple specific secrets by key
 */
export async function getSecretsByKeys(
	keys: string[],
	options: Omit<GetSecretsOptions, 'attachToProcessEnv'> = {}
): Promise<Record<string, string | undefined>> {
	const results: Record<string, string | undefined> = {};

	// Fetch all secrets and filter (more efficient than individual calls)
	const client = getClient();
	const environment = options.environment || detectEnvironment();
	const projectId = options.projectId || process.env.INFISICAL_PROJECT_ID;

	if (!projectId) {
		throw new Error('Project ID is required.');
	}

	const secrets = (await client.listSecrets({
		environment,
		projectId,
		path: options.path || '/',
		includeImports: options.includeImports ?? true,
	})) as SecretEntry[];

	const secretsMap = new Map(secrets.map((s) => [s.secretKey, s.secretValue]));

	for (const key of keys) {
		results[key] = secretsMap.get(key);
	}

	return results;
}

/**
 * Load secrets into process.env (for Node.js scripts)
 */
export async function loadSecretsToEnv(options: GetSecretsOptions = {}): Promise<void> {
	await getSecrets(AllSecretsSchema, {
		...options,
		attachToProcessEnv: true,
		skipValidation: true,
	});
}
